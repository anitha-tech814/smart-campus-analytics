"""
Offline embedding backend for retrieval.

Retrieval is entirely local and dependency-light: a deterministic scikit-learn
``HashingVectorizer`` (word + bigram hashing) supplies the semantic channel. It
needs no model download, no network, and no model server, supports true
incremental indexing (each chunk is embedded independently), and produces
identical vectors on every run.

No external embedding service and no local model server are used.
"""
from __future__ import annotations

from typing import List

import numpy as np

from app.services.rag import config


def _l2_normalize(matrix: np.ndarray) -> np.ndarray:
    if matrix.ndim == 1:
        matrix = matrix.reshape(1, -1)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (matrix / norms).astype(np.float32)


class BaseEmbedder:
    name: str = "base"
    dim: int = 0
    is_model_based: bool = False

    def embed_texts(self, texts: List[str]) -> np.ndarray:  # pragma: no cover - abstract
        raise NotImplementedError

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]


class HashingEmbedder(BaseEmbedder):
    """Offline, dependency-light lexical vectorizer (word + bigram hashing)."""

    name = "hashing-tfidf"
    is_model_based = False

    def __init__(self, dim: int | None = None):
        from sklearn.feature_extraction.text import HashingVectorizer

        self.dim = int(dim or config.HASH_EMBED_DIM)
        # norm=None + our own l2 normalisation keeps behaviour explicit.
        self._vectorizer = HashingVectorizer(
            n_features=self.dim,
            analyzer="word",
            ngram_range=(1, 2),
            alternate_sign=False,
            norm=None,
            lowercase=True,
            token_pattern=r"[a-zA-Z0-9_]+",
        )

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        matrix = self._vectorizer.transform(texts).toarray()
        return _l2_normalize(matrix)


_EMBEDDER_CACHE: dict = {"key": None, "embedder": None}


def get_embedder() -> BaseEmbedder:
    """Return the offline embedding backend (cached)."""
    key = ("hashing", config.HASH_EMBED_DIM)
    if _EMBEDDER_CACHE["key"] == key and _EMBEDDER_CACHE["embedder"] is not None:
        return _EMBEDDER_CACHE["embedder"]
    embedder = HashingEmbedder()
    _EMBEDDER_CACHE["key"] = key
    _EMBEDDER_CACHE["embedder"] = embedder
    return embedder


def embedding_status() -> dict:
    """Status of the retrieval embedding backend (for the UI)."""
    embedder = get_embedder()
    return {
        "backend": embedder.name,
        "is_model_based": embedder.is_model_based,
        "dim": embedder.dim,
        "setup_hint": None,
    }
