"""Email provider factory — creates the configured provider."""

from __future__ import annotations

import logging
from functools import lru_cache

from .base import EmailProvider
from .smtp_provider import SMTPEmailProvider

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
    # Future providers:
    # elif provider_name == "sendgrid":
    #     from .sendgrid_provider import SendGridEmailProvider
    #     _provider = SendGridEmailProvider(api_key=settings.SENDGRID_API_KEY)
    # elif provider_name == "ses":
    #     from .ses_provider import SESEmailProvider
    #     _provider = SESEmailProvider(region=settings.SES_REGION)
    # elif provider_name == "resend":
    #     from .resend_provider import ResendEmailProvider
    #     _provider = ResendEmailProvider(api_key=settings.RESEND_API_KEY)
    else:
        raise ValueError(f"Unknown email provider: {provider_name!r}. Supported: smtp")

    log.info("Email provider initialized: %s", _provider.name)
    return _provider
