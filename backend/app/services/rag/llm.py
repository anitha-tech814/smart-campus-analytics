"""
OpenRouter LLM client used for grounded answer generation.

OpenRouter exposes an OpenAI-compatible Chat Completions API, so the assistant
can generate grounded prose answers with the Python standard library only (no
local model server, no provider SDK).

Security notes
--------------
* The API key is read from the backend environment (``OPENROUTER_API_KEY``) and
  is only ever sent as an ``Authorization`` header.
* It is never logged, never returned in API responses, and is scrubbed from any
  error string that could otherwise bubble up to the client.

When the key is missing or the provider is unreachable, callers receive an
honest :class:`LLMUnavailable` (or an ``available: false`` status) and the
assistant degrades to deterministic evidence instead of pretending a model
answered.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Dict, List, Optional

from app.services.rag import config


class LLMUnavailable(RuntimeError):
    """Raised when the LLM cannot serve a request (missing key, provider error...)."""


def _scrub(text: str) -> str:
    """Remove any accidental secret material from an error string."""
    key = config.OPENROUTER_API_KEY
    if key and key in text:
        text = text.replace(key, "***")
    return text


def is_available() -> Dict[str, object]:
    """Return availability info without raising and without any network call."""
    if not config.LLM_ENABLED:
        return {
            "available": False,
            "provider": "openrouter",
            "model": config.LLM_MODEL,
            "configured": bool(config.OPENROUTER_API_KEY),
            "reason": "LLM generation disabled via RAG_DISABLE_LLM.",
        }
    if not config.OPENROUTER_API_KEY:
        return {
            "available": False,
            "provider": "openrouter",
            "model": config.LLM_MODEL,
            "configured": False,
            "reason": "OPENROUTER_API_KEY is not set.",
        }
    return {
        "available": True,
        "provider": "openrouter",
        "model": config.LLM_MODEL,
        "configured": True,
        "reason": None,
    }


def _build_request(messages: List[Dict[str, str]], temperature: Optional[float]) -> urllib.request.Request:
    payload = {
        "model": config.LLM_MODEL,
        "messages": messages,
        "temperature": config.LLM_TEMPERATURE if temperature is None else temperature,
        "max_tokens": config.LLM_MAX_TOKENS,
        "stream": False,
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Bearer {config.OPENROUTER_API_KEY}",
    }
    # Optional attribution headers recommended by OpenRouter.
    if config.OPENROUTER_SITE_URL:
        headers["HTTP-Referer"] = config.OPENROUTER_SITE_URL
    if config.OPENROUTER_APP_TITLE:
        headers["X-Title"] = config.OPENROUTER_APP_TITLE
    return urllib.request.Request(
        f"{config.OPENROUTER_BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )


def _read_error(exc: urllib.error.HTTPError) -> str:
    """Extract a short, sanitized error message from a provider HTTP error."""
    try:
        raw = exc.read().decode("utf-8", errors="replace")
    except Exception:  # noqa: BLE001 - error bodies are best-effort
        return ""
    detail = ""
    try:
        payload = json.loads(raw)
        err = payload.get("error")
        if isinstance(err, dict):
            detail = str(err.get("message") or err.get("code") or "")
        elif err:
            detail = str(err)
        if not detail:
            detail = str(payload.get("message") or "")
    except (ValueError, TypeError):
        detail = raw
    return _scrub(detail.strip())[:200]


def _retry_after(exc: urllib.error.HTTPError, fallback: float) -> float:
    """Honour a provider Retry-After header, capped to keep responses snappy."""
    header = None
    try:
        header = exc.headers.get("Retry-After") if exc.headers else None
    except Exception:  # noqa: BLE001
        header = None
    if header:
        try:
            return min(float(header), 30.0)
        except (TypeError, ValueError):
            pass
    return min(fallback, 30.0)


def chat(messages: List[Dict[str, str]], temperature: Optional[float] = None) -> str:
    """Send a chat completion request to OpenRouter and return the reply text."""
    status = is_available()
    if not status["available"]:
        raise LLMUnavailable(str(status.get("reason") or "LLM unavailable."))

    attempts = max(1, config.LLM_MAX_RETRIES)
    backoff = max(0.0, config.LLM_RETRY_BACKOFF)
    last_error = "OpenRouter request failed."

    for attempt in range(attempts):
        try:
            request = _build_request(messages, temperature)
            with urllib.request.urlopen(request, timeout=config.LLM_TIMEOUT_SECONDS) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            choices = body.get("choices") or []
            content = ""
            if choices:
                content = ((choices[0].get("message") or {}).get("content") or "").strip()
            if not content:
                raise LLMUnavailable("The model returned an empty response.")
            return content
        except urllib.error.HTTPError as exc:
            code = exc.code
            if code in (401, 403):
                raise LLMUnavailable(
                    "OpenRouter authentication failed. Check that OPENROUTER_API_KEY is valid."
                ) from exc
            if code == 429:
                last_error = "OpenRouter rate limit reached (HTTP 429). Please retry shortly."
                if attempt < attempts - 1:
                    time.sleep(_retry_after(exc, backoff * (attempt + 1)))
                    continue
                break
            detail = _read_error(exc)
            if 400 <= code < 500:
                # Non-retryable client error (e.g. unknown model id, bad request).
                suffix = f": {detail}" if detail else ""
                raise LLMUnavailable(f"OpenRouter rejected the request (HTTP {code}){suffix}.") from exc
            # 5xx: transient, retry.
            suffix = f": {detail}" if detail else ""
            last_error = f"OpenRouter server error (HTTP {code}){suffix}."
            if attempt < attempts - 1:
                time.sleep(backoff * (attempt + 1))
                continue
            break
        except LLMUnavailable:
            raise
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
            last_error = f"OpenRouter request failed: {_scrub(str(exc))}"
            if attempt < attempts - 1:
                time.sleep(backoff * (attempt + 1))
                continue
            break

    raise LLMUnavailable(_scrub(last_error))


def health() -> Dict[str, object]:
    """Report LLM status for the UI (never includes the API key)."""
    status = dict(is_available())
    status["provider"] = "openrouter"
    status["model"] = config.LLM_MODEL
    status["base_url"] = config.OPENROUTER_BASE_URL
    status["model_installed"] = bool(config.OPENROUTER_API_KEY)
    setup_hint = None
    if not config.LLM_ENABLED:
        setup_hint = (
            "Generation is disabled (RAG_DISABLE_LLM=1). Unset it to enable "
            "OpenRouter answers."
        )
    elif not config.OPENROUTER_API_KEY:
        setup_hint = (
            "Set OPENROUTER_API_KEY in backend/.env (copy backend/.env.example) "
            "to enable generated answers."
        )
    status["setup_hint"] = setup_hint
    return status
