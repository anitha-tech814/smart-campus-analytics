"""
RAG (Retrieval-Augmented Generation) assistant for Smart Campus Analytics.

Retrieval and analytics are always local:
  * Source-code / documentation retrieval uses a persistent local vector store.
  * Embeddings use a deterministic offline scikit-learn hashing vectorizer —
    no model download, no network, and no local model server.
  * Numerical questions are answered by a safe, read-only live-data query engine
    that computes metrics directly from the active SQLite dataset.

Answer generation uses the OpenRouter API (OpenAI-compatible Chat Completions)
and is optional: without a configured backend API key, the assistant runs in a
deterministic, retrieval-only mode. The API key never leaves the backend.
"""

__all__ = [
    "config",
    "embeddings",
    "chunker",
    "vector_store",
    "indexer",
    "llm",
    "data_tools",
    "router",
    "rag_service",
]
