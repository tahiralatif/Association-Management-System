"""Lightweight LLM client — wraps the OpenAI SDK for Groq (OpenAI-compatible)."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

log = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazy-init OpenAI client pointed at Groq."""
    global _client
    if _client is not None:
        return _client

    api_key = settings.GROQ_API_KEY or settings.LLM_API_KEY
    if not api_key:
        return None

    try:
        from openai import OpenAI
        _client = OpenAI(
            api_key=api_key,
            base_url=settings.GROQ_BASE_URL,
        )
        return _client
    except Exception:
        log.exception("Failed to init LLM client")
        return None


def is_available() -> bool:
    """Check if LLM is configured and reachable."""
    return _get_client() is not None


def chat(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str | None:
    """Send a chat completion request. Returns the reply text or None on failure."""
    client = _get_client()
    if client is None:
        return None

    try:
        resp = client.chat.completions.create(
            model=model or settings.GROQ_MODEL or settings.LLM_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""
    except Exception:
        log.exception("LLM chat call failed")
        return None


def complete(
    prompt: str,
    *,
    system: str = "",
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str | None:
    """Convenience: single-prompt completion with optional system message."""
    msgs: list[dict[str, str]] = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": prompt})
    return chat(msgs, model=model, temperature=temperature, max_tokens=max_tokens)
