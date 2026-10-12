"""Tests for the RAG assistant (offline / no-network)."""
import io
import json
import os
import tempfile
import unittest
from unittest import mock

import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Student
from app.api.routes_students import invalidate_enriched_cache
from app.services.rag import chunker, config, router, indexer, llm
from app.services.rag.embeddings import HashingEmbedder
from app.services.rag.vector_store import VectorStore, compute_bm25_stats, tokenize
from app.services.rag.data_tools import DataTools
from app.services.rag import rag_service


def _student(sid, dept, year, cgpa, att, placement, **extra):
    data = dict(
        id=sid,
        name=f"Student {sid}",
        department=dept,
        year=year,
        cgpa=cgpa,
        attendance=att,
        lms_engagement=70.0,
        coding_score=70.0,
        aptitude_score=70.0,
        mock_interview_score=70.0,
        placement_status=placement,
        historical_cgpa_prev=cgpa,
        faculty_mentor="Prof. Test",
    )
    data.update(extra)
    return Student(**data)


class TestChunker(unittest.TestCase):
    def test_discover_files_excludes_and_scopes(self):
        with tempfile.TemporaryDirectory() as root:
            def write(rel, text="x"):
                path = os.path.join(root, rel)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "w", encoding="utf-8") as handle:
                    handle.write(text)

            write("backend/app/main.py")
            write("README.md")
            write("backend/app/services/rag/config.py")          # self-excluded
            write("frontend/src/components/ChatAssistant.tsx")   # self-excluded
            write("node_modules/pkg/index.js")                   # excluded dir
            write("backend/creds_token.py")                      # sensitive fragment
            write("data/dump.csv", "a,b\n1,2\n")                 # excluded extension

            found = chunker.discover_files(root)
            self.assertIn("backend/app/main.py", found)
            self.assertIn("README.md", found)
            self.assertNotIn("backend/app/services/rag/config.py", found)
            self.assertNotIn("frontend/src/components/ChatAssistant.tsx", found)
            self.assertFalse(any(p.startswith("node_modules/") for p in found))
            self.assertNotIn("backend/creds_token.py", found)
            self.assertNotIn("data/dump.csv", found)

    def test_chunk_text_sections_and_bounds(self):
        py = (
            "import os\n\n"
            "def alpha():\n"
            "    return 1\n\n"
            "class Beta:\n"
            "    pass\n"
        )
        chunks = chunker.chunk_text("sample.py", py)
        sections = {c.section for c in chunks}
        self.assertIn("alpha", sections)
        self.assertIn("Beta", sections)
        for c in chunks:
            self.assertEqual(c.source, "sample.py")
            self.assertGreaterEqual(c.start_line, 1)
            self.assertLessEqual(c.start_line, c.end_line)

        md = "# Title\nintro\n## Section One\nbody\n## Section Two\nmore\n"
        md_chunks = chunker.chunk_text("doc.md", md)
        md_sections = {c.section for c in md_chunks}
        self.assertIn("Section One", md_sections)
        self.assertIn("Section Two", md_sections)
        self.assertTrue(all(c.category == "doc" for c in md_chunks))


class TestEmbeddings(unittest.TestCase):
    def test_hashing_embedder_dim_norm_deterministic(self):
        emb = HashingEmbedder(dim=512)
        self.assertEqual(emb.dim, 512)
        self.assertFalse(emb.is_model_based)
        vecs = emb.embed_texts(["hello world", "branch risk analysis"])
        self.assertEqual(vecs.shape, (2, 512))
        for row in vecs:
            self.assertAlmostEqual(float(np.linalg.norm(row)), 1.0, places=5)
        again = emb.embed_texts(["hello world", "branch risk analysis"])
        self.assertTrue(np.allclose(vecs, again))
        empty = emb.embed_texts([])
        self.assertEqual(empty.shape, (0, 512))


class TestVectorStore(unittest.TestCase):
    def _store(self):
        chunks = [
            {"chunk_id": "a#1", "source": "backend/app/api/routes_analytics.py", "section": "branch_risk_overview",
             "category": "code", "start_line": 1, "end_line": 9,
             "text": "branch risk overview endpoint returns per-branch risk percentage and critical counts"},
            {"chunk_id": "b#1", "source": "frontend/src/views/BranchRiskView.tsx", "section": "BranchRiskView",
             "category": "code", "start_line": 1, "end_line": 8,
             "text": "react component renders the branch risk table with filters and excel export"},
            {"chunk_id": "c#1", "source": "README.md", "section": "Setup",
             "category": "doc", "start_line": 1, "end_line": 6,
             "text": "install python dependencies and run the uvicorn backend server"},
        ]
        emb = HashingEmbedder(dim=512)
        vectors = emb.embed_texts([c["text"] for c in chunks])
        tmp = tempfile.mkdtemp()
        store = VectorStore(
            index_file=os.path.join(tmp, "index.json"),
            vectors_file=os.path.join(tmp, "vectors.npy"),
        )
        store.chunks = chunks
        store.vectors = vectors
        store.meta = {
            "embed_backend": emb.name,
            "embed_dim": emb.dim,
            "bm25": compute_bm25_stats(chunks),
        }
        store.save()
        return store, emb, tmp

    def test_bm25_stats(self):
        stats = compute_bm25_stats([{"text": "a b c"}, {"text": "a b"}])
        self.assertEqual(stats["n"], 2)
        self.assertEqual(stats["df"]["a"], 2)
        self.assertEqual(stats["df"]["c"], 1)
        self.assertGreater(stats["avgdl"], 0)

    def test_save_load_roundtrip_and_search(self):
        store, emb, _tmp = self._store()
        reloaded = VectorStore(index_file=store.index_file, vectors_file=store.vectors_file)
        self.assertTrue(reloaded.load())
        self.assertEqual(len(reloaded.chunks), 3)
        self.assertEqual(reloaded.vectors.shape, (3, 512))

        qvec = emb.embed_query("branch risk overview endpoint")
        results = reloaded.search(qvec, "branch risk overview endpoint", top_k=3)
        self.assertTrue(results)
        self.assertEqual(results[0]["source"], "backend/app/api/routes_analytics.py")
        scores = [r["score"] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_tokenize(self):
        self.assertEqual(tokenize("Branch-Risk_overview v2"), ["branch", "risk_overview", "v2"])


class TestRouter(unittest.TestCase):
    def test_intents(self):
        self.assertEqual(router.classify("How many students need support?")["intent"], "data")
        self.assertEqual(router.classify("What is the average CGPA?")["intent"], "data")
        intent = router.classify("How does the branch risk endpoint work?")["intent"]
        self.assertIn(intent, ("code", "both"))
        self.assertEqual(
            router.classify("the assistant is not working, it throws a 500 error")["intent"], "debug"
        )
        self.assertEqual(router.classify("explain the project architecture")["intent"], "code")

    def test_followup_detection(self):
        history = [{"role": "user", "content": "How many students are at risk in CSE?"}]
        self.assertTrue(router.classify("what about that branch", history)["needs_history"])
        self.assertFalse(router.classify("what about that branch", None)["needs_history"])


class TestIndexerIncremental(unittest.TestCase):
    """The change-aware indexer must handle incremental rebuilds safely."""

    def setUp(self):
        self._orig_store = indexer._STORE
        self.tmp = tempfile.mkdtemp()
        self.store = VectorStore(
            index_file=os.path.join(self.tmp, "index.json"),
            vectors_file=os.path.join(self.tmp, "vectors.npy"),
        )
        indexer._STORE = self.store
        self.root = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.root, "app"))
        with open(os.path.join(self.root, "app", "main.py"), "w", encoding="utf-8") as handle:
            handle.write("def hello():\n    return 1\n")
        with open(os.path.join(self.root, "README.md"), "w", encoding="utf-8") as handle:
            handle.write("# Title\nsome documentation\n")

    def tearDown(self):
        indexer._STORE = self._orig_store

    def test_incremental_rebuild(self):
        first = indexer.build_index(force=True, root=self.root)
        self.assertTrue(first["full_rebuild"])
        self.assertGreater(first["chunk_count"], 0)

        second = indexer.build_index(force=False, root=self.root)
        self.assertFalse(second["full_rebuild"])
        self.assertGreaterEqual(second["unchanged"], 1)

        with open(os.path.join(self.root, "README.md"), "a", encoding="utf-8") as handle:
            handle.write("additional section\n")
        third = indexer.build_index(force=False, root=self.root)
        self.assertEqual(third["updated"], 1)
        self.assertGreaterEqual(third["unchanged"], 1)


class TestDataTools(unittest.TestCase):
    def setUp(self):
        invalidate_enriched_cache()
        fd, self._db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        self.engine = create_engine(f"sqlite:///{self._db_path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        db = self.Session()
        db.add_all([
            _student("S1", "CSE", 1, 5.0, 60.0, "Needs Training"),
            _student("S2", "CSE", 2, 8.0, 90.0, "Ready"),
            _student("S3", "Mechanical", 1, 6.5, 80.0, "In Progress"),
            _student("S4", "Mechanical", 1, 9.0, 95.0, "Placed"),
        ])
        db.commit()
        db.close()

    def tearDown(self):
        invalidate_enriched_cache()
        self.engine.dispose()
        try:
            os.remove(self._db_path)
        except OSError:
            pass

    def _tools(self):
        return DataTools(self.Session())

    def test_support_denominator(self):
        res = self._tools().answer("How many students need support?")
        self.assertIsNotNone(res)
        self.assertEqual(res["intent"], "DATA_SUPPORT")
        self.assertEqual(res["dataset"]["active_dataset_records"], 4)
        self.assertEqual(res["metrics_summary"]["Denominator"], 4)

    def test_threshold_filter(self):
        res = self._tools().answer("Show students with attendance below 75%")
        self.assertEqual(res["intent"], "DATA_THRESHOLD")
        self.assertEqual(res["metrics_summary"]["students below Attendance % 75"], 1)
        self.assertEqual(res["table_rows"][0]["ID"], "S1")

    def test_average(self):
        res = self._tools().answer("What is the average CGPA?")
        self.assertEqual(res["intent"], "DATA_AVERAGE")
        self.assertAlmostEqual(res["metrics_summary"]["Average CGPA"], 7.12, delta=0.02)

    def test_branch_summary(self):
        res = self._tools().answer("How many students are at risk in CSE?")
        self.assertEqual(res["intent"], "DATA_BRANCH_SUMMARY")
        self.assertEqual(res["metrics_summary"]["Students"], 2)
        self.assertEqual(res["dataset"]["evaluated"], 2)

    def test_branch_overview(self):
        res = self._tools().answer("Compare all branches by risk percentage")
        self.assertEqual(res["intent"], "DATA_BRANCH_OVERVIEW")
        self.assertEqual(len(res["table_rows"]), 2)

    def test_ranking(self):
        res = self._tools().answer("Which branch has the highest average CGPA?")
        self.assertEqual(res["intent"], "DATA_RANKING")
        self.assertEqual(res["metrics_summary"]["Top branch (CGPA)"], "Mechanical")

    def test_ranking_by_headcount(self):
        db = self.Session()
        db.add(_student("S5", "CSE", 1, 7.0, 85.0, "Ready"))
        db.commit()
        db.close()
        res = self._tools().answer("Which branch is the biggest by headcount?")
        self.assertEqual(res["intent"], "DATA_RANKING")
        self.assertEqual(res["metrics_summary"]["Top branch (Students)"], "CSE")
        self.assertEqual(res["table_rows"][0]["Branch"], "CSE")

    def test_compound_question_merges_intents(self):
        res = self._tools().answer("How many students need support, and what is the average CGPA?")
        self.assertEqual(res["intent"], "DATA_MULTI")
        self.assertIn("Denominator", res["metrics_summary"])
        self.assertIn("Average CGPA", res["metrics_summary"])

    def test_compound_with_single_match_stays_single(self):
        res = self._tools().answer("Show attendance below 75% and something totally unrelated")
        self.assertEqual(res["intent"], "DATA_THRESHOLD")

    def test_highest_risk_percentage_uses_branch_overview(self):
        res = self._tools().answer("Which branch has the highest risk percentage?")
        self.assertEqual(res["intent"], "DATA_BRANCH_OVERVIEW")
        self.assertEqual(len(res["table_rows"]), 2)

    def test_backlogs_reported_na(self):
        res = self._tools().answer("How many students have backlogs?")
        self.assertEqual(res["intent"], "DATA_BACKLOGS_NA")

    def test_placement_readiness_vs_outcome(self):
        res = self._tools().answer("Show the placement readiness distribution")
        self.assertEqual(res["intent"], "DATA_PLACEMENT")
        self.assertEqual(res["metrics_summary"]["Outcome data available"], 0)
        self.assertIn("N/A", res["answer"])

    def test_unmatched_returns_none(self):
        self.assertIsNone(self._tools().answer("please do something completely unrelated"))

    def test_empty_dataset(self):
        empty_path = tempfile.mktemp(suffix=".db")
        engine = create_engine(f"sqlite:///{empty_path}")
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)
        invalidate_enriched_cache()
        res = DataTools(Session()).answer("How many students need support?")
        self.assertEqual(res["intent"], "DATA_EMPTY")
        engine.dispose()
        try:
            os.remove(empty_path)
        except OSError:
            pass


class TestRagServiceDegraded(unittest.TestCase):
    """answer() must work end-to-end without any LLM / network."""

    def setUp(self):
        invalidate_enriched_cache()
        self._original_enabled = config.LLM_ENABLED
        config.LLM_ENABLED = False
        fd, self._db_path = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        self.engine = create_engine(f"sqlite:///{self._db_path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        db = self.Session()
        db.add_all([
            _student("S1", "CSE", 1, 5.0, 60.0, "Needs Training"),
            _student("S2", "CSE", 2, 8.0, 90.0, "Ready"),
        ])
        db.commit()
        db.close()

    def tearDown(self):
        config.LLM_ENABLED = self._original_enabled
        invalidate_enriched_cache()
        self.engine.dispose()
        try:
            os.remove(self._db_path)
        except OSError:
            pass

    def test_data_question_returns_live_data_without_llm(self):
        res = rag_service.answer("How many students need support?", db=self.Session())
        self.assertEqual(res["intent"], "data")
        self.assertTrue(res["degraded"])
        self.assertFalse(res["engine"]["used_live_data"] is False)
        self.assertIsNotNone(res["data"])
        self.assertEqual(res["data"]["dataset"]["active_dataset_records"], 2)
        self.assertIn("2", res["answer"])

    def test_both_intent_downgrades_when_no_data_match(self):
        # Router sees data + code signals, but DataTools has no computation for
        # this phrasing -> intent must downgrade to "code" with no data block.
        res = rag_service.answer("Where is the attendance threshold defined?", db=self.Session())
        self.assertEqual(res["intent"], "code")
        self.assertIsNone(res["data"])
        self.assertFalse(res["engine"]["used_live_data"])

    def test_health_status_shape(self):
        status = rag_service.health_status()
        self.assertIn("llm", status)
        self.assertIn("embedding", status)
        self.assertIn("index", status)
        self.assertIn("ready", status)
        self.assertFalse(status["llm"]["available"])


class _FakeHTTPResponse:
    """Minimal context-manager stand-in for urllib's HTTP response."""

    def __init__(self, payload):
        self._body = json.dumps(payload).encode("utf-8")

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _http_error(code, message="provider error", retry_after=None):
    import urllib.error

    headers = {}
    if retry_after is not None:
        headers["Retry-After"] = str(retry_after)
    fp = io.BytesIO(json.dumps({"error": {"message": message}}).encode("utf-8"))
    return urllib.error.HTTPError(
        "https://openrouter.ai/api/v1/chat/completions", code, "error", headers, fp
    )


class TestOpenRouterLLM(unittest.TestCase):
    """The OpenRouter client must work without any real network or key."""

    def setUp(self):
        self._orig = (config.LLM_ENABLED, config.OPENROUTER_API_KEY)
        config.LLM_ENABLED = True
        config.OPENROUTER_API_KEY = ""

    def tearDown(self):
        config.LLM_ENABLED, config.OPENROUTER_API_KEY = self._orig

    def test_unavailable_without_key(self):
        status = llm.is_available()
        self.assertFalse(status["available"])
        self.assertEqual(status["provider"], "openrouter")
        self.assertIn("OPENROUTER_API_KEY", status["reason"])
        self.assertIn("OPENROUTER_API_KEY", llm.health()["setup_hint"])
        with self.assertRaises(llm.LLMUnavailable):
            llm.chat([{"role": "user", "content": "hi"}])

    def test_available_with_key(self):
        config.OPENROUTER_API_KEY = "sk-or-test-key"
        status = llm.is_available()
        self.assertTrue(status["available"])
        self.assertEqual(status["model"], config.LLM_MODEL)

    def test_chat_parses_openai_response(self):
        config.OPENROUTER_API_KEY = "sk-or-test-key"
        body = {"choices": [{"message": {"content": "  grounded answer  "}}]}
        with mock.patch(
            "app.services.rag.llm.urllib.request.urlopen", return_value=_FakeHTTPResponse(body)
        ):
            out = llm.chat([{"role": "user", "content": "q"}])
        self.assertEqual(out, "grounded answer")

    def test_sends_bearer_header_but_health_hides_key(self):
        key = "sk-or-super-secret"
        config.OPENROUTER_API_KEY = key
        captured = {}

        def fake_urlopen(request, timeout=None):
            captured["url"] = request.full_url
            captured["auth"] = request.get_header("Authorization")
            return _FakeHTTPResponse({"choices": [{"message": {"content": "ok"}}]})

        with mock.patch("app.services.rag.llm.urllib.request.urlopen", side_effect=fake_urlopen):
            llm.chat([{"role": "user", "content": "q"}])

        self.assertTrue(captured["url"].endswith("/chat/completions"))
        self.assertEqual(captured["auth"], f"Bearer {key}")
        self.assertNotIn(key, json.dumps(llm.health()))

    def test_auth_error_is_sanitized(self):
        key = "sk-or-secret-123"
        config.OPENROUTER_API_KEY = key
        with mock.patch(
            "app.services.rag.llm.urllib.request.urlopen", side_effect=_http_error(401, "invalid key")
        ), mock.patch("app.services.rag.llm.time.sleep"):
            with self.assertRaises(llm.LLMUnavailable) as ctx:
                llm.chat([{"role": "user", "content": "q"}])
        self.assertIn("authentication", str(ctx.exception).lower())
        self.assertNotIn(key, str(ctx.exception))

    def test_rate_limit_retries_then_succeeds(self):
        config.OPENROUTER_API_KEY = "sk-or-test-key"
        seq = [
            _http_error(429, "slow down", retry_after=0),
            _FakeHTTPResponse({"choices": [{"message": {"content": "after retry"}}]}),
        ]
        with mock.patch("app.services.rag.llm.urllib.request.urlopen", side_effect=seq), \
                mock.patch("app.services.rag.llm.time.sleep"):
            out = llm.chat([{"role": "user", "content": "q"}])
        self.assertEqual(out, "after retry")

    def test_client_error_is_not_retried(self):
        config.OPENROUTER_API_KEY = "sk-or-test-key"
        calls = {"n": 0}

        def fake(request, timeout=None):
            calls["n"] += 1
            raise _http_error(400, "unknown model")

        with mock.patch("app.services.rag.llm.urllib.request.urlopen", side_effect=fake), \
                mock.patch("app.services.rag.llm.time.sleep"):
            with self.assertRaises(llm.LLMUnavailable):
                llm.chat([{"role": "user", "content": "q"}])
        self.assertEqual(calls["n"], 1)

    def test_network_error_never_leaks_key(self):
        import urllib.error

        key = "sk-or-leak-me"
        config.OPENROUTER_API_KEY = key
        with mock.patch(
            "app.services.rag.llm.urllib.request.urlopen",
            side_effect=urllib.error.URLError(f"connection failed to {key}"),
        ), mock.patch("app.services.rag.llm.time.sleep"):
            with self.assertRaises(llm.LLMUnavailable) as ctx:
                llm.chat([{"role": "user", "content": "q"}])
        self.assertNotIn(key, str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
