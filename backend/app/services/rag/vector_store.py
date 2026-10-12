"""
Persistent local vector store with hybrid retrieval.

Storage layout (inside ``backend/rag_store/``):
  * ``index.json``   - chunk metadata + per-file signatures + backend + BM25 stats.
  * ``vectors.npy``  - normalised float32 embedding matrix (n_chunks x dim).

Retrieval blends:
  * **semantic** cosine similarity over local embeddings, and
  * **lexical** BM25 (IDF-weighted) overlap, so rare identifiers and file names
    dominate over ubiquitous project words, plus a small path/section boost.
"""
from __future__ import annotations

import json
import math
import os
import re
import time
from collections import Counter
from typing import Any, Dict, List, Optional

import numpy as np

from app.services.rag import config

_TOKEN_RE = re.compile(r"[a-zA-Z0-9_]+")
_K1, _B = 1.2, 0.75


def tokenize(text: str) -> List[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def compute_bm25_stats(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Document-frequency + average length statistics for BM25 scoring."""
    df: Counter = Counter()
    total_len = 0
    for chunk in chunks:
        tokens = tokenize(chunk.get("text", ""))
        total_len += len(tokens)
        for token in set(tokens):
            df[token] += 1
    n = len(chunks) or 1
    return {"df": dict(df), "avgdl": total_len / n, "n": n}


class VectorStore:
    def __init__(self, index_file: str = None, vectors_file: str = None):
        self.index_file = index_file or config.INDEX_FILE
        self.vectors_file = vectors_file or config.VECTORS_FILE
        self.meta: Dict[str, Any] = {}
        self.chunks: List[Dict[str, Any]] = []
        self.vectors: Optional[np.ndarray] = None

    # -- persistence -------------------------------------------------------
    def exists(self) -> bool:
        return os.path.exists(self.index_file) and os.path.exists(self.vectors_file)

    def save(self) -> None:
        os.makedirs(os.path.dirname(self.index_file), exist_ok=True)
        self.meta["updated_at"] = time.time()
        self.meta["chunk_count"] = len(self.chunks)
        payload = dict(self.meta)
        payload["chunks"] = self.chunks
        tmp_index = self.index_file + ".tmp"
        with open(tmp_index, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False)
        os.replace(tmp_index, self.index_file)

        vectors = self.vectors
        if vectors is None:
            vectors = np.zeros((0, int(self.meta.get("embed_dim", 0) or 0)), dtype=np.float32)
        tmp_vec = self.vectors_file + ".tmp"
        with open(tmp_vec, "wb") as handle:
            np.save(handle, vectors.astype(np.float32))
        os.replace(tmp_vec, self.vectors_file)

    def load(self) -> bool:
        if not self.exists():
            return False
        try:
            with open(self.index_file, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            self.chunks = payload.pop("chunks", [])
            self.meta = payload
            with open(self.vectors_file, "rb") as handle:
                self.vectors = np.load(handle, allow_pickle=False).astype(np.float32)
            if self.vectors.ndim == 1:
                self.vectors = self.vectors.reshape(0, -1)
            return len(self.chunks) == self.vectors.shape[0]
        except (OSError, ValueError, KeyError):
            self.meta = {}
            self.chunks = []
            self.vectors = None
            return False

    def clear(self) -> None:
        self.meta = {}
        self.chunks = []
        self.vectors = None
        for path in (self.index_file, self.vectors_file):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass

    # -- search ------------------------------------------------------------
    def _bm25_score(
        self,
        query_tokens: List[str],
        doc_tokens: List[str],
        df: Dict[str, int],
        n_docs: int,
        avgdl: float,
    ) -> float:
        if not doc_tokens or not query_tokens:
            return 0.0
        tf = Counter(doc_tokens)
        dl = len(doc_tokens)
        score = 0.0
        for token in set(query_tokens):
            freq = tf.get(token, 0)
            if freq == 0:
                continue
            dfi = df.get(token, 0)
            idf = math.log(1.0 + (n_docs - dfi + 0.5) / (dfi + 0.5))
            denom = freq + _K1 * (1.0 - _B + _B * dl / (avgdl or 1.0))
            score += idf * (freq * (_K1 + 1.0)) / (denom or 1.0)
        return score

    def search(self, query_vec: np.ndarray, query_text: str, top_k: int = None) -> List[Dict[str, Any]]:
        top_k = top_k or config.TOP_K
        if self.vectors is None or len(self.chunks) == 0:
            return []
        q = np.asarray(query_vec, dtype=np.float32).reshape(-1)
        if q.shape[0] != self.vectors.shape[1]:
            return []
        norm = float(np.linalg.norm(q)) or 1.0
        semantic = self.vectors @ (q / norm)

        query_tokens = tokenize(query_text)
        query_lower = {t for t in query_tokens if len(t) >= 3}
        bm = self.meta.get("bm25") or {}
        df = bm.get("df") or {}
        n_docs = int(bm.get("n") or len(self.chunks))
        avgdl = float(bm.get("avgdl") or 1.0)

        sem_max = float(semantic.max()) if semantic.size else 0.0
        sem_max = sem_max if sem_max > 0 else 1.0

        raw: List[Dict[str, Any]] = []
        kw_max = 0.0
        for i, chunk in enumerate(self.chunks):
            kw = self._bm25_score(query_tokens, tokenize(chunk.get("text", "")), df, n_docs, avgdl)
            kw_max = max(kw_max, kw)
            raw.append({"i": i, "sem": float(semantic[i]), "kw": kw})
        kw_max = kw_max or 1.0

        results: List[Dict[str, Any]] = []
        for item in raw:
            chunk = self.chunks[item["i"]]
            sem_norm = max(0.0, item["sem"]) / sem_max
            kw_norm = item["kw"] / kw_max
            # Path / section token boost (favours the file actually being asked about).
            source_tokens = set(tokenize(chunk.get("source", ""))) | set(tokenize(chunk.get("section", "")))
            path_bonus = 0.12 if (query_lower & source_tokens) else 0.0
            combined = min(1.0, config.HYBRID_ALPHA * sem_norm + (1.0 - config.HYBRID_ALPHA) * kw_norm + path_bonus)
            results.append(
                {
                    "chunk_id": chunk.get("chunk_id"),
                    "source": chunk.get("source"),
                    "section": chunk.get("section", ""),
                    "category": chunk.get("category", "code"),
                    "start_line": chunk.get("start_line"),
                    "end_line": chunk.get("end_line"),
                    "text": chunk.get("text", ""),
                    "score": round(combined, 4),
                    "semantic_score": round(sem_norm, 4),
                    "keyword_score": round(kw_norm, 4),
                }
            )
        results.sort(key=lambda r: r["score"], reverse=True)
        return results[:top_k]

    def stats(self) -> Dict[str, Any]:
        files: Dict[str, int] = {}
        for chunk in self.chunks:
            files[chunk["source"]] = files.get(chunk["source"], 0) + 1
        return {
            "chunk_count": len(self.chunks),
            "document_count": len(files),
            "embed_backend": self.meta.get("embed_backend"),
            "embed_dim": self.meta.get("embed_dim"),
            "created_at": self.meta.get("created_at"),
            "updated_at": self.meta.get("updated_at"),
            "documents": files,
            "vector_count": int(self.vectors.shape[0]) if self.vectors is not None else 0,
        }
