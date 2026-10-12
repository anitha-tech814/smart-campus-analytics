"""
Incremental indexer for the local RAG store.

Re-indexing is change-aware: each file is fingerprinted (sha1 + size); only added
or modified files are re-embedded, unchanged files reuse their existing vectors,
and deleted files are dropped. The whole index is rebuilt automatically when the
embedding backend changes.
"""
from __future__ import annotations

import hashlib
import os
import threading
import time
from typing import Any, Dict, List, Tuple

import numpy as np

from app.services.rag import chunker, config
from app.services.rag.embeddings import get_embedder
from app.services.rag.vector_store import VectorStore, compute_bm25_stats

_LOCK = threading.Lock()
_STORE: VectorStore | None = None


def get_store() -> VectorStore:
    global _STORE
    if _STORE is None:
        _STORE = VectorStore()
    return _STORE


def _fingerprint(root: str, rel_path: str) -> Dict[str, Any] | None:
    abs_path = os.path.join(root, rel_path)
    try:
        stat = os.stat(abs_path)
        with open(abs_path, "rb") as handle:
            digest = hashlib.sha1(handle.read()).hexdigest()
    except OSError:
        return None
    return {"size": stat.st_size, "sha1": digest}


def _embed_chunks(embedder, chunks: List[chunker.Chunk]) -> np.ndarray:
    if not chunks:
        return np.zeros((0, embedder.dim), dtype=np.float32)
    texts = [c.text for c in chunks]
    # Embed in batches to keep memory bounded on CPU-only machines.
    batch = 64
    parts = [embedder.embed_texts(texts[i:i + batch]) for i in range(0, len(texts), batch)]
    return np.vstack(parts).astype(np.float32)


def build_index(force: bool = False, root: str | None = None) -> Dict[str, Any]:
    """Build or incrementally refresh the local index. Returns a summary dict."""
    root = os.path.abspath(root or config.PROJECT_ROOT)
    started = time.time()
    with _LOCK:
        store = get_store()
        loaded = False if force else store.load()

        embedder = get_embedder()
        backend_ok = (
            loaded
            and store.meta.get("embed_backend") == embedder.name
            and int(store.meta.get("embed_dim") or 0) == int(embedder.dim)
        )
        full_rebuild = force or not loaded or not backend_ok

        old_files: Dict[str, Any] = {} if full_rebuild else dict(store.meta.get("files", {}))
        old_rows: Dict[str, List[int]] = {}
        if not full_rebuild:
            for idx, ch in enumerate(store.chunks):
                old_rows.setdefault(ch["source"], []).append(idx)
        old_chunks = store.chunks
        old_vectors = store.vectors

        discovered = chunker.discover_files(root)
        new_signatures: Dict[str, Any] = {}
        new_chunks: List[chunker.Chunk] = []
        new_vector_parts: List[np.ndarray] = []

        added = updated = unchanged = 0
        for rel in discovered:
            sig = _fingerprint(root, rel)
            if sig is None:
                continue
            new_signatures[rel] = sig
            previous = old_files.get(rel)
            is_unchanged = (
                not full_rebuild
                and previous is not None
                and previous.get("sha1") == sig["sha1"]
                and rel in old_rows
            )
            if is_unchanged:
                unchanged += 1
                for row_idx in old_rows[rel]:
                    new_chunks.append(old_chunks[row_idx])
                if old_vectors is not None and old_rows[rel]:
                    new_vector_parts.append(old_vectors[old_rows[rel]])
                continue

            text = chunker.read_text_file(root, rel)
            if not text:
                continue
            file_chunks = chunker.chunk_text(rel, text)
            if not file_chunks:
                continue
            vectors = _embed_chunks(embedder, file_chunks)
            new_chunks.extend(file_chunks)
            new_vector_parts.append(vectors)
            if previous is None:
                added += 1
            else:
                updated += 1

        removed = len([p for p in old_files if p not in new_signatures])
        vectors = (
            np.vstack(new_vector_parts).astype(np.float32)
            if new_vector_parts
            else np.zeros((0, embedder.dim), dtype=np.float32)
        )

        store.chunks = [c.__dict__ if isinstance(c, chunker.Chunk) else dict(c) for c in new_chunks]
        store.vectors = vectors
        store.meta = {
            "version": 1,
            "root": root,
            "embed_backend": embedder.name,
            "embed_dim": int(embedder.dim),
            "llm_model": config.LLM_MODEL,
            "created_at": (store.meta.get("created_at") if not full_rebuild else None) or time.time(),
            "files": new_signatures,
            "chunk_size": config.CHUNK_SIZE,
            "bm25": compute_bm25_stats(store.chunks),
        }
        store.save()

        return {
            "full_rebuild": full_rebuild,
            "added": added,
            "updated": updated,
            "removed": removed,
            "unchanged": unchanged,
            "chunk_count": len(store.chunks),
            "document_count": len(new_signatures),
            "embed_backend": embedder.name,
            "embed_dim": int(embedder.dim),
            "seconds": round(time.time() - started, 3),
        }


def ensure_index() -> Dict[str, Any]:
    """Build the index on first use (or repair it) if it is missing/invalid."""
    store = get_store()
    if store.exists() and store.load():
        embedder = get_embedder()
        if (
            store.meta.get("embed_backend") == embedder.name
            and int(store.meta.get("embed_dim") or 0) == int(embedder.dim)
        ):
            return {"status": "ready", "reused": True, **store.stats()}
    return {"status": "rebuilt", "reused": False, **build_index(force=False)}


def index_status() -> Dict[str, Any]:
    """Report index status: document/chunk counts, last updated, backend info."""
    store = get_store()
    exists = store.exists()
    if exists and (not store.chunks and store.vectors is None):
        store.load()
    stats = store.stats() if exists else {
        "chunk_count": 0, "document_count": 0,
        "embed_backend": None, "embed_dim": None,
        "created_at": None, "updated_at": None, "documents": {}, "vector_count": 0,
    }
    return {"index_exists": exists, **stats}


def reset_index() -> Dict[str, Any]:
    with _LOCK:
        store = get_store()
        store.clear()
        return {"status": "cleared"}
