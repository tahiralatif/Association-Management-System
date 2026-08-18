"""Email provider factory — creates the configured provider."""

from __future__ import annotations

import logging
from functools import lru_cache

from .base import EmailProvider
from .smtp_provider import SMTPEmailProvider
from .resend_provider import ResendEmailProvider

log = logging.getLogger(__name__)

_provider: EmailProvider | None = None


def get_email_provider() -> EmailProvider:
    """Get or create the singleton email provider based on EMAIL_PROVIDER env var."""
    global _provider
    if _provider is not None:
        return _provider

    from app.config import settings

    provider_name = getattr(settings, "EMAIL_PROVIDER", "smtp").lower()

    if provider_name == "smtp":
        _provider = SMTPEmailProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            from_email=settings.EMAIL_FROM,
            from_name=getattr(settings, "EMAIL_FROM_NAME", ""),
        )
    elif provider_name == "resend":
        _provider = ResendEmailProvider(
            api_key=settings.RESEND_API_KEY,
            from_email=settings.EMAIL_FROM,
            from_name=getattr(settings, "EMAIL_FROM_NAME", ""),
        )
    else:
        raise ValueError(f"Unknown email provider: {provider_name!r}. Supported: smtp")

    log.info("Email provider initialized: %s", _provider.name)
    return _provider
