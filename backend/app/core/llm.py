"""Lightweight LLM client — wraps the OpenAI SDK for Groq (OpenAI-compatible)."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

log = logging.getLogger(__name__)

_client = None

# Fallback models — tried in order if primary hits rate limits
FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "llama-3.1-8b-instant",
]


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
    """Send a chat completion request. Returns the reply text or None on failure.
    
    Automatically falls back to lighter models on rate limit errors.
    """
    client = _get_client()
    if client is None:
        return None

    primary_model = model or settings.GROQ_MODEL or settings.LLM_MODEL
    
    # Build list of models to try
    models_to_try = [primary_model]
    for fb in FALLBACK_MODELS:
        if fb != primary_model:
            models_to_try.append(fb)

    for attempt_model in models_to_try:
        try:
            resp = client.chat.completions.create(
                model=attempt_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            if attempt_model != primary_model:
                log.info("LLM fallback: used %s instead of %s", attempt_model, primary_model)
            return resp.choices[0].message.content or ""
        except Exception as e:
            error_str = str(e)
            if "rate_limit" in error_str or "429" in error_str:
                log.warning("LLM rate limit on %s, trying fallback...", attempt_model)
                continue
            # Non-rate-limit error — don't retry
            log.exception("LLM chat call failed (model=%s)", attempt_model)
            return None

    log.error("All LLM models exhausted (rate limited)")
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
