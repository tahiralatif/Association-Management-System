"""Email sending tasks — Celery tasks for async email delivery.

Uses the email provider abstraction layer (app/core/email/) for sending
and logs every attempt to the email_sending_logs table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from celery import shared_task

log = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(
    self,
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
    tags: dict | None = None,
    tenant_id: str | None = None,
    recipient_id: str | None = None,
):
    """Send a single email via the configured provider.

    This is the primary Celery task for transactional emails.
    Logs the result to email_sending_logs.
    """
    import asyncio

    async def _send():
        from app.core.email.service import send_email
        from app.core.database import async_session_factory

        async with async_session_factory() as db:
            result = await send_email(
                to=to,
                subject=subject,
                html_body=html_body,
                text_body=text_body,
                tags=tags or {},
                tenant_id=tenant_id,
                recipient_id=recipient_id,
                db=db,
                max_retries=1,  # Celery handles retries
            )
            await db.commit()
            return result

    try:
        result = asyncio.run(_send())
        log.info("Email sent: to=%s status=%s", to, result.status)
        return {"status": result.status, "to": to, "subject": subject}
    except Exception as exc:
        log.exception("Email task failed for %s", to)
        # Log the failure if possible
        try:
            _log_failure_sync(to, subject, str(exc), tenant_id)
        except Exception:
            log.exception("Failed to log email failure")
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=2)
def send_campaign_email_task(
    self,
    campaign_id: str,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    html_body: str,
    tenant_id: str | None = None,
):
    """Send a campaign email to a single recipient with Jinja2 variable replacement."""
    import asyncio

    # Simple variable replacement for campaign emails
    personalized = html_body.replace("{{name}}", recipient_name)
    personalized = personalized.replace("{{email}}", recipient_email)

    async def _send():
        from app.core.email.service import send_email
        from app.core.database import async_session_factory

        async with async_session_factory() as db:
            result = await send_email(
                to=recipient_email,
                subject=subject,
                html_body=personalized,
                tags={"campaign_id": campaign_id, "type": "campaign"},
                tenant_id=tenant_id,
                campaign_id=campaign_id,
                db=db,
                max_retries=1,
            )
            await db.commit()
            return result

    try:
        result = asyncio.run(_send())
        log.info("Campaign email sent: to=%s campaign=%s status=%s", recipient_email, campaign_id, result.status)
        return {"status": result.status, "campaign_id": campaign_id, "to": recipient_email}
    except Exception as exc:
        log.exception("Campaign email task failed for %s", recipient_email)
        raise self.retry(exc=exc)


@shared_task
def send_bulk_emails_task(emails: list[dict], tenant_id: str | None = None):
    """Fan-out: send multiple emails using Celery group."""
    from celery import group

    jobs = group(
        send_email_task.s(
            to=e["to"],
            subject=e["subject"],
            html_body=e["html_body"],
            text_body=e.get("text_body"),
            tags=e.get("tags"),
            tenant_id=tenant_id,
        )
        for e in emails
    )
    result = jobs.apply_async()
    return {"job_id": str(result.id), "count": len(emails)}


def _log_failure_sync(to: str, subject: str, error: str, tenant_id: str | None):
    """Synchronously log a failure when async is not available.
    Uses a temporary sync engine for Celery task context.
    """
    import uuid
    from sqlalchemy import create_engine, text
    from app.config import settings

    # Extract sync URL from async URL
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)

    try:
        with engine.connect() as conn:
            conn.execute(
                text("""
                    INSERT INTO email_sending_logs
                    (id, tenant_id, recipient_email, subject, status, provider, error_message, created_at)
                    VALUES (:id, :tenant_id, :recipient_email, :subject, :status, :provider, :error_message, :created_at)
                """),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "recipient_email": to,
                    "subject": subject,
                    "status": "failed",
                    "provider": "smtp",
                    "error_message": error,
                    "created_at": datetime.now(timezone.utc),
                },
            )
            conn.commit()
    except Exception:
        log.exception("Failed to log email failure to DB")
    finally:
        engine.dispose()


# ── Backward compatibility aliases ───────────────────────────
send_email = send_email_task
send_campaign_email = send_campaign_email_task
send_bulk_emails = send_bulk_emails_task
