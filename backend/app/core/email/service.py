"""Email service — template rendering, sending, logging, retries.

This is the main entry point for sending emails in the AMS.
It handles:
  - Loading templates from DB or files
  - Rendering with Jinja2 variable substitution
  - Sending via the configured provider
  - Logging to the database (EmailSendingLog)
  - Retry logic with exponential backoff
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .base import EmailMessage, EmailResult, EmailStatus

log = logging.getLogger(__name__)

# ── Jinja2 Setup ────────────────────────────────────────────

_TEMPLATE_DIR = Path(__file__).parent.parent.parent.parent / "templates" / "emails"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_template_string(template_str: str, variables: dict[str, Any]) -> tuple[str, str]:
    """Render a template string with Jinja2 variables.
    Returns (html_body, subject) where subject comes from a {# subject: ... #} comment
    in the template, or is empty if not found.
    """
    env = Environment(autoescape=select_autoescape(["html", "xml"]))
    # Extract subject from template comment if present
    subject = ""
    if "{# subject:" in template_str:
        import re
        m = re.search(r"\{\#\s*subject:\s*(.+?)\s*\#\}", template_str)
        if m:
            subject = m.group(1)

    tmpl = env.from_string(template_str)
    rendered = tmpl.render(**variables)
    return rendered, subject


def render_file_template(template_name: str, variables: dict[str, Any]) -> tuple[str, str]:
    """Render a template file with Jinja2 variables.
    Returns (html_body, subject).
    """
    tmpl = _jinja_env.get_template(template_name)
    rendered = tmpl.render(**variables)

    # Extract subject from template comment if present
    subject = ""
    import re
    m = re.search(r"\{\#\s*subject:\s*(.+?)\s*\#\}", rendered)
    if m:
        subject = m.group(1)

    return rendered, subject


# ── Sending ─────────────────────────────────────────────────

async def send_email(
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    from_email: str | None = None,
    reply_to: str | None = None,
    tags: dict[str, str] | None = None,
    tenant_id: str | None = None,
    recipient_id: str | None = None,
    template_id: str | None = None,
    campaign_id: str | None = None,
    db: Any = None,
    max_retries: int = 3,
) -> EmailResult:
    """Send an email with full logging and retry support.

    This is the primary function to call for sending transactional emails.
    Logs the attempt to EmailSendingLog via db if provided.
    """
    from .factory import get_email_provider

    provider = get_email_provider()
    from app.config import settings

    message = EmailMessage(
        to=to,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        from_email=from_email or settings.EMAIL_FROM,
        reply_to=reply_to,
        tags=tags or {},
    )

    last_result: EmailResult | None = None
    for attempt in range(max_retries):
        result = await provider.send(message)
        result.retry_count = attempt
        last_result = result

        if result.status == EmailStatus.SENT:
            # Log success
            if db is not None:
                await _log_send(
                    db=db,
                    tenant_id=tenant_id,
                    recipient_id=recipient_id,
                    recipient_email=to,
                    subject=subject,
                    html_body=html_body,
                    status="sent",
                    provider=provider.name,
                    template_id=template_id,
                    campaign_id=campaign_id,
                    retry_count=attempt,
                )
            return result

        # Log retry attempt
        log.warning(
            "Email send failed (attempt %d/%d): to=%s error=%s",
            attempt + 1, max_retries, to, result.error,
        )
        if attempt < max_retries - 1:
            import asyncio
            await asyncio.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s

    # All retries exhausted
    if db is not None and last_result:
        await _log_send(
            db=db,
            tenant_id=tenant_id,
            recipient_id=recipient_id,
            recipient_email=to,
            subject=subject,
            html_body=html_body,
            status="failed",
            provider=provider.name,
            error=last_result.error,
            template_id=template_id,
            campaign_id=campaign_id,
            retry_count=max_retries,
        )

    return last_result or EmailResult.failure(provider="unknown", error="No attempts made")


async def send_template_email(
    to: str,
    template_name: str,
    variables: dict[str, Any],
    subject_override: str | None = None,
    from_email: str | None = None,
    reply_to: str | None = None,
    tags: dict[str, str] | None = None,
    tenant_id: str | None = None,
    recipient_id: str | None = None,
    campaign_id: str | None = None,
    db: Any = None,
) -> EmailResult:
    """Send an email using a file template from templates/emails/."""
    html_body, template_subject = render_file_template(template_name, variables)
    subject = subject_override or template_subject

    return await send_email(
        to=to,
        subject=subject,
        html_body=html_body,
        from_email=from_email,
        reply_to=reply_to,
        tags={**(tags or {}), "template": template_name},
        tenant_id=tenant_id,
        recipient_id=recipient_id,
        campaign_id=campaign_id,
        db=db,
    )


async def send_bulk_emails(
    messages: list[dict[str, Any]],
    tenant_id: str | None = None,
    campaign_id: str | None = None,
    db: Any = None,
) -> dict[str, Any]:
    """Send multiple emails. Each dict has: to, subject, html_body, text_body (opt)."""
    results = {"sent": 0, "failed": 0, "errors": []}

    for msg_data in messages:
        result = await send_email(
            to=msg_data["to"],
            subject=msg_data["subject"],
            html_body=msg_data["html_body"],
            text_body=msg_data.get("text_body"),
            tags=msg_data.get("tags"),
            tenant_id=tenant_id,
            recipient_id=msg_data.get("recipient_id"),
            campaign_id=campaign_id,
            db=db,
            max_retries=2,
        )
        if result.status == EmailStatus.SENT:
            results["sent"] += 1
        else:
            results["failed"] += 1
            results["errors"].append({"to": msg_data["to"], "error": result.error})

    return results


# ── Logging ─────────────────────────────────────────────────

async def _log_send(
    db: Any,
    tenant_id: str | None,
    recipient_id: str | None,
    recipient_email: str,
    subject: str,
    html_body: str,
    status: str,
    provider: str,
    error: str | None = None,
    template_id: str | None = None,
    campaign_id: str | None = None,
    retry_count: int = 0,
) -> None:
    """Write a record to the email_sending_logs table."""
    try:
        from sqlalchemy import text
        import uuid as _uuid

        log_id = str(_uuid.uuid4())
        now = datetime.now(timezone.utc)

        # Truncate body preview to 500 chars
        body_preview = html_body[:500] if html_body else None

        await db.execute(
            text("""
                INSERT INTO email_sending_logs
                (id, tenant_id, recipient_id, recipient_email, subject, body_preview,
                 status, provider, error_message, template_id, campaign_id,
                 retry_count, sent_at, created_at)
                VALUES
                (:id, :tenant_id, :recipient_id, :recipient_email, :subject, :body_preview,
                 :status, :provider, :error_message, :template_id, :campaign_id,
                 :retry_count, :sent_at, :created_at)
            """),
            {
                "id": log_id,
                "tenant_id": tenant_id,
                "recipient_id": recipient_id,
                "recipient_email": recipient_email,
                "subject": subject,
                "body_preview": body_preview,
                "status": status,
                "provider": provider,
                "error_message": error,
                "template_id": template_id,
                "campaign_id": campaign_id,
                "retry_count": retry_count,
                "sent_at": now,
                "created_at": now,
            },
        )
        await db.flush()
    except Exception:
        log.exception("Failed to log email send to %s", recipient_email)
