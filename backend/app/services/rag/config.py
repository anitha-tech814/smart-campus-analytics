"""
Configuration for the RAG assistant.

All values can be overridden with environment variables (see ``backend/.env.example``)
so the model / provider can be swapped without code changes. Answer generation
uses the OpenRouter API; retrieval stays fully local and needs no model server.
"""
import os

from app.config import BASE_DIR

# --- Project layout -------------------------------------------------------
# BASE_DIR is the `backend/` directory; the project root is its parent.
PROJECT_ROOT = os.path.dirname(BASE_DIR)
RAG_STORE_DIR = os.path.join(BASE_DIR, "rag_store")
INDEX_FILE = os.path.join(RAG_STORE_DIR, "index.json")
VECTORS_FILE = os.path.join(RAG_STORE_DIR, "vectors.npy")

# --- LLM generation provider (OpenRouter) ---------------------------------
# OpenRouter exposes an OpenAI-compatible Chat Completions API, so answer
# generation no longer needs a local model server. The API key is read from the
# backend environment only and is never exposed to the frontend, logs, or API
# responses.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
# Chat model id as published by OpenRouter (e.g. "openai/gpt-4o-mini").
LLM_MODEL = (
    os.environ.get("OPENROUTER_MODEL")
    or os.environ.get("RAG_LLM_MODEL")  # legacy alias
    or "openai/gpt-4o-mini"
).strip()
# Optional attribution headers recommended by OpenRouter (safe to leave blank).
OPENROUTER_SITE_URL = os.environ.get("OPENROUTER_SITE_URL", "").strip()
OPENROUTER_APP_TITLE = os.environ.get("OPENROUTER_APP_TITLE", "Smart Campus Analytics").strip()
# Set RAG_DISABLE_LLM=1 to force the deterministic (no-generation) mode.
LLM_ENABLED = os.environ.get("RAG_DISABLE_LLM", "0") not in ("1", "true", "True")

# API calls are network-bound: use a modest timeout and retry transient failures
# (network blips, 5xx) with a linear backoff. Rate limits (HTTP 429) honour the
# provider's Retry-After header.
LLM_TIMEOUT_SECONDS = int(os.environ.get("RAG_LLM_TIMEOUT", "60"))
LLM_TEMPERATURE = float(os.environ.get("RAG_LLM_TEMPERATURE", "0.2"))
LLM_MAX_TOKENS = int(os.environ.get("RAG_LLM_MAX_TOKENS", "768"))
LLM_MAX_RETRIES = int(os.environ.get("RAG_LLM_MAX_RETRIES", "3"))
LLM_RETRY_BACKOFF = float(os.environ.get("RAG_LLM_RETRY_BACKOFF", "1.5"))

# --- Retrieval embeddings ------------------------------------------------
# Retrieval is fully offline and needs no model server: a deterministic
# scikit-learn hashing vectorizer (word + bigram) supplies the semantic channel.
HASH_EMBED_DIM = int(os.environ.get("RAG_HASH_DIM", "4096"))

# --- Chunking -------------------------------------------------------------
CHUNK_SIZE = int(os.environ.get("RAG_CHUNK_SIZE", "1400"))       # target chars / chunk
CHUNK_OVERLAP = int(os.environ.get("RAG_CHUNK_OVERLAP", "160"))  # overlap chars
MAX_FILE_BYTES = int(os.environ.get("RAG_MAX_FILE_BYTES", str(400 * 1024)))

# --- Retrieval ------------------------------------------------------------
TOP_K = int(os.environ.get("RAG_TOP_K", "6"))
# Hybrid blend: weight of semantic similarity vs. keyword overlap.
HYBRID_ALPHA = float(os.environ.get("RAG_HYBRID_ALPHA", "0.55"))
# Cap how much retrieved context is sent to the model. API models have large
# context windows, so the default is generous; lower it to reduce token cost.
MAX_CONTEXT_CHARS = int(os.environ.get("RAG_MAX_CONTEXT_CHARS", "4000"))
# Bounded conversation history (turns) kept for follow-up resolution.
MAX_HISTORY_TURNS = int(os.environ.get("RAG_MAX_HISTORY_TURNS", "8"))

# --- Index discovery ------------------------------------------------------
INCLUDE_EXTENSIONS = {
    ".md", ".py", ".ts", ".tsx", ".js", ".jsx", ".json",
    ".bat", ".txt", ".css", ".html", ".toml", ".yml", ".yaml", ".cfg", ".ini",
}

# Directories that are never indexed (dependencies, build output, secrets, data dumps).
EXCLUDE_DIRS = {
    "node_modules", "dist", "build", ".git", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", "venv", ".venv", "env", "rag_store",
    "backups", "tools_bin", ".vscode", ".idea", "coverage", ".next", "out",
}

# Project-relative path prefixes never indexed. The RAG package excludes its own
# implementation and chat UI so the assistant cites the *project's* real code,
# not itself (self-citation is circular and drowns out the canonical sources).
EXCLUDE_REL_PREFIXES = (
    "backend/app/services/rag/",
    "frontend/src/components/ChatAssistant.tsx",
    "frontend/src/components/FloatingChatAssistant.tsx",
)

# File-name fragments that are never indexed (generated / lockfiles / secrets).
EXCLUDE_NAME_FRAGMENTS = {
    "package-lock.json", ".min.js", ".min.css", ".map",
    ".env", "secret", "credential", "password", "token", "apikey", "api_key",
    ".pem", ".key", ".pfx", ".p12", ".crt", ".pfx", "id_rsa", "id_ed25519",
}

# Data / binary artifacts that are handled by the live-data engine, not RAG.
EXCLUDE_EXTENSIONS = {
    ".db", ".sqlite", ".sqlite3", ".npy", ".npz", ".pkl", ".pickle",
    ".csv", ".xlsx", ".xls", ".parquet", ".zip", ".tar", ".gz", ".7z",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
    ".ttf", ".eot", ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin", ".lock",
}
