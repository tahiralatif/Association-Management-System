"""Lightweight LLM client — wraps the OpenAI SDK for OpenRouter/Groq (OpenAI-compatible)."""

from __future__ import annotations

import logging
from typing import Any

from app.config import settings

log = logging.getLogger(__name__)

_client = None

# Fallback models — tried in order if primary hits rate limits
FALLBACK_MODELS = [
    "meta-llama/llama-3.1-8b-instruct",
    "google/gemma-4-31b-it:free",
    "llama-3.1-8b-instant",
]


def _get_client():
    """Lazy-init OpenAI client. Primary: OpenRouter. Fallback: Groq."""
    global _client
    if _client is not None:
        return _client

    # Try OpenRouter first
    api_key = settings.LLM_API_KEY or settings.GROQ_API_KEY
    base_url = getattr(settings, "LLM_BASE_URL", None) or settings.GROQ_BASE_URL

    if not api_key:
        return None

    try:
        from openai import OpenAI
        _client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        log.info("LLM client initialized: provider=%s model=%s", settings.LLM_PROVIDER, settings.LLM_MODEL)
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
    
    Automatically falls back to other models on rate limit errors.
    """
    client = _get_client()
    if client is None:
        return None

    primary_model = model or settings.LLM_MODEL or settings.GROQ_MODEL
    
    # Build list of models to try: primary first, then fallbacks
    models_to_try = [primary_model]
    for fb in FALLBACK_MODELS:
        if fb != primary_model:
            models_to_try.append(fb)
    # Also try Groq model as last resort
    groq_model = settings.GROQ_MODEL
    if groq_model and groq_model not in models_to_try:
        models_to_try.append(groq_model)

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
            # Non-rate-limit error — log and try next
            log.warning("LLM error on %s: %s", attempt_model, error_str[:200])
            continue

    log.error("All LLM models exhausted")
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
