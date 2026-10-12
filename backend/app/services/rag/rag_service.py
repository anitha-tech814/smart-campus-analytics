"""
RAG orchestration: route -> gather evidence (retrieval + live data) -> generate.

Design principles:
  * Numbers always come from the live-data engine, never from the LLM.
  * Project/code answers are grounded in retrieved chunks with citations.
  * If the configured LLM (OpenRouter) is unavailable the assistant degrades
    gracefully to deterministic data answers and raw retrieved evidence (never
    fabricating). Retrieval itself is always local.
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from app.services.rag import config, indexer, llm, router
from app.services.rag.data_tools import SUGGESTED as DATA_SUGGESTED
from app.services.rag.data_tools import DataTools
from app.services.rag.embeddings import embedding_status, get_embedder

CODE_SUGGESTED = [
    "How does the branch risk endpoint work?",
    "Where is the composite success score calculated?",
    "What are the default risk thresholds and where are they configured?",
    "Explain the project architecture and tech stack",
    "How do I set up and run the project?",
]


def _clip(text: str, limit: int) -> str:
    text = text.strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _safe_error(exc: Exception) -> str:
    """Return an error string that can never leak the provider API key."""
    message = str(exc)
    key = config.OPENROUTER_API_KEY
    if key and key in message:
        message = message.replace(key, "***")
    return message[:300]


def _retrieve(query: str, top_k: Optional[int] = None) -> List[Dict[str, Any]]:
    store = indexer.get_store()
    if not store.exists() or not store.chunks:
        indexer.ensure_index()
        store = indexer.get_store()
    if not store.chunks:
        return []
    embedder = get_embedder()
    try:
        qvec = embedder.embed_query(query)
    except Exception:
        return []
    return store.search(qvec, query, top_k=top_k)


def _citations(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    citations = []
    for r in results:
        citations.append(
            {
                "source": r["source"],
                "section": r.get("section") or "",
                "start_line": r.get("start_line"),
                "end_line": r.get("end_line"),
                "score": r.get("score"),
                "snippet": _clip(r.get("text", ""), 280),
            }
        )
    return citations


def _log_context() -> str:
    """Best-effort tail of local log files (project-scoped, read-only)."""
    candidates = []
    for name in ("backend", "."):
        base = os.path.join(config.PROJECT_ROOT, name)
        if os.path.isdir(base):
            try:
                for entry in os.listdir(base):
                    if entry.lower().endswith(".log"):
                        candidates.append(os.path.join(base, entry))
            except OSError:
                pass
    if not candidates:
        return ""
    latest = max(candidates, key=lambda p: os.path.getmtime(p) if os.path.exists(p) else 0)
    try:
        with open(latest, "r", encoding="utf-8", errors="replace") as handle:
            tail = handle.read()[-2000:]
        return f"RECENT LOGS ({os.path.relpath(latest, config.PROJECT_ROOT)}):\n{tail}"
    except OSError:
        return ""


def _build_context(results: List[Dict[str, Any]], logs: str) -> str:
    parts = []
    used = 0
    for r in results:
        header = f"--- [{r['source']}" + (f" § {r['section']}" if r.get("section") else "") + f" (lines {r.get('start_line')}-{r.get('end_line')})] ---"
        block = f"{header}\n{r.get('text','')}"
        if used + len(block) > config.MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        used += len(block)
    if logs:
        parts.append(logs[:1500])
    return "\n\n".join(parts)


def _compose_messages(
    query: str,
    context: str,
    data_ctx: Optional[Dict[str, Any]],
    history: List[Dict[str, str]],
) -> List[Dict[str, str]]:
    system = (
        "You are a grounded assistant embedded in the 'Smart Campus Analytics' project. "
        "Answer ONLY using the RETRIEVED CONTEXT (project source, docs) and the LIVE DATA block.\n"
        "Rules:\n"
        "1) Never invent numbers, file contents, or features. If the LIVE DATA block is present, "
        "use its numbers verbatim and mention the denominator and any filters.\n"
        "2) Cite project evidence inline like [path § section].\n"
        "3) Risk flags are prompts for human review, not proof of failure. Keep placement READINESS "
        "distinct from actual placement OUTCOMES.\n"
        "4) If the context/data lacks the answer, say what is unavailable and ask ONE focused "
        "clarifying question or suggest a next step.\n"
        "5) Be concise, structured, and honest about limitations. Never reveal secrets."
    )
    blocks = []
    if context:
        blocks.append("RETRIEVED CONTEXT:\n" + context)
    if data_ctx is not None:
        blocks.append(
            "LIVE DATA (computed from the active dataset - reuse these exact numbers):\n"
            + json.dumps(
                {
                    "answer": data_ctx.get("answer"),
                    "metrics_summary": data_ctx.get("metrics_summary"),
                    "table_rows": (data_ctx.get("table_rows") or [])[:15],
                    "dataset": data_ctx.get("dataset"),
                },
                ensure_ascii=False,
                default=str,
            )
        )
    messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
    messages.extend(history[-config.MAX_HISTORY_TURNS * 2:])
    user_content = ("\n\n".join(blocks) + "\n\nQUESTION: " + query) if blocks else query
    messages.append({"role": "user", "content": user_content})
    return messages


def _fallback_answer(
    query: str,
    results: List[Dict[str, Any]],
    data_ctx: Optional[Dict[str, Any]],
    llm_status: Dict[str, Any],
) -> str:
    reason = llm_status.get("reason") or "Local LLM is unavailable."
    lines = [f"⚠️ **Local LLM generation is unavailable** ({reason})"]
    if llm_status.get("setup_hint"):
        lines.append(f"_Setup:_ {llm_status['setup_hint']}")
    if data_ctx is not None:
        lines.append("\n**Deterministic live-data answer (exact, computed from the active dataset):**\n")
        lines.append(data_ctx.get("answer", ""))
    if results:
        lines.append("\n**Most relevant project excerpts I found:**")
        for r in results[:5]:
            loc = r["source"] + (f" § {r['section']}" if r.get("section") else "")
            lines.append(f"• [{loc}] (lines {r.get('start_line')}-{r.get('end_line')}): {_clip(r.get('text',''), 220)}")
    if data_ctx is None and not results:
        lines.append("\nI could not find evidence for this in the project files or the active dataset. "
                     "Could you rephrase, or narrow it to a specific file, endpoint, or metric?")
    return "\n".join(lines)


def answer(query: str, history: Optional[List[Dict[str, str]]] = None, db=None) -> Dict[str, Any]:
    history = history or []
    route = router.classify(query, history)
    intent = route["intent"]

    # Resolve follow-ups against recent user turns for retrieval.
    retrieval_query = query
    if route["needs_history"]:
        recent_users = [h["content"] for h in history if h.get("role") == "user"]
        if recent_users:
            retrieval_query = recent_users[-1] + " " + query

    results: List[Dict[str, Any]] = []
    if intent in ("code", "both", "debug"):
        results = _retrieve(retrieval_query)

    data_ctx: Optional[Dict[str, Any]] = None
    if intent in ("data", "both"):
        try:
            data_ctx = DataTools(db).answer(query)
        except Exception as exc:  # never 500 the assistant on a data-tool error
            data_ctx = {
                "matched": True,
                "intent": "DATA_ERROR",
                "answer": f"The live-data engine could not compute this query: {exc}",
                "dataset": {"active_dataset_records": 0},
            }

    # A "both" question whose data part could not be computed is really just a
    # documentation question; downgrade the reported intent so the UI and engine
    # footer stay honest (it never fabricates a data answer).
    if intent == "both" and data_ctx is None:
        intent = "code"

    # If a "data" question didn't match a computation, fall back to retrieval.
    if intent == "data" and (data_ctx is None):
        results = _retrieve(retrieval_query)

    logs = _log_context() if intent == "debug" else ""
    context = _build_context(results, logs)
    citations = _citations(results)

    llm_status = llm.health()
    degraded = False
    notes: List[str] = []

    if llm_status.get("available") and (context or data_ctx is not None):
        try:
            messages = _compose_messages(query, context, data_ctx, history)
            answer_text = llm.chat(messages)
        except Exception as exc:
            degraded = True
            notes.append(f"LLM error: {_safe_error(exc)}")
            answer_text = _fallback_answer(query, results, data_ctx, llm_status)
    else:
        degraded = True
        answer_text = _fallback_answer(query, results, data_ctx, llm_status)

    if intent == "both" and data_ctx is not None:
        notes.append("Combined documentation retrieval with a live-data computation.")

    suggested = list(dict.fromkeys((data_ctx or {}).get("suggested_queries", []) + DATA_SUGGESTED[:4] + CODE_SUGGESTED[:3]))

    return {
        "query": query,
        "intent": intent,
        "route": route,
        "answer": answer_text,
        "engine": {
            "llm_model": config.LLM_MODEL,
            "llm_available": bool(llm_status.get("available")),
            "llm_reason": llm_status.get("reason"),
            "embed_backend": embedding_status().get("backend"),
            "retrieved_chunks": len(results),
            "used_live_data": data_ctx is not None,
        },
        "citations": citations,
        "data": (
            {
                "intent": data_ctx.get("intent"),
                "table_headers": data_ctx.get("table_headers"),
                "table_rows": data_ctx.get("table_rows"),
                "metrics_summary": data_ctx.get("metrics_summary"),
                "dataset": data_ctx.get("dataset"),
            }
            if data_ctx is not None
            else None
        ),
        "suggested_queries": suggested,
        "degraded": degraded,
        "notes": notes,
    }


def health_status() -> Dict[str, Any]:
    llm_status = llm.health()
    embed = embedding_status()
    idx = indexer.index_status()
    return {
        "llm": llm_status,
        "embedding": embed,
        "index": idx,
        "ready": {
            # The assistant is usable (degraded at worst) as long as the index or
            # data engine is available; generation requires the LLM.
            "generation": bool(llm_status.get("available")),
            "retrieval": bool(idx.get("index_exists")) or os.path.isdir(config.RAG_STORE_DIR),
            "data_engine": True,
        },
    }


def get_index_status() -> Dict[str, Any]:
    return indexer.index_status()


def reindex(force: bool = False) -> Dict[str, Any]:
    return indexer.build_index(force=force)


def reset_index() -> Dict[str, Any]:
    return indexer.reset_index()
