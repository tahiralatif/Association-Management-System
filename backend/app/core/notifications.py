"""Notification service — trigger emails on business events.

Uses the email provider abstraction layer for sending and Jinja2 templates
from templates/emails/ for HTML content. Templates are stored separately
from code for easy editing without redeployment.
"""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)


def _send_email_task(
    to: str,
    subject: str,
    html_body: str,
    tags: dict[str, str] | None = None,
    tenant_id: str | None = None,
    recipient_id: str | None = None,
):
    """Fire-and-forget email via Celery. Swallows errors silently."""
    try:
        from app.tasks.email import send_email_task
        send_email_task.delay(
            to=to,
            subject=subject,
            html_body=html_body,
            tags=tags or {},
            tenant_id=tenant_id,
            recipient_id=recipient_id,
        )
    except Exception:
        log.exception("Failed to dispatch email to %s", to)


def _render_and_send(
    to: str,
    template_name: str,
    variables: dict,
    subject_override: str | None = None,
    tags: dict[str, str] | None = None,
    tenant_id: str | None = None,
    recipient_id: str | None = None,
):
    """Render a Jinja2 template file and send via Celery task."""
    from app.core.email.service import render_file_template

    html_body, template_subject = render_file_template(template_name, variables)
    subject = subject_override or template_subject

    _send_email_task(
        to=to,
        subject=subject,
        html_body=html_body,
        tags={**(tags or {}), "template": template_name},
        tenant_id=tenant_id,
        recipient_id=recipient_id,
    )


# ── Invoice Notifications ────────────────────────────────────

def notify_invoice_created(invoice_number: str, total: float, member_email: str, member_name: str, due_date: str, tenant_id: str | None = None):
    """Send invoice created notification."""
    _render_and_send(
        to=member_email,
        template_name="invoice_created.html",
        variables={
            "member_name": member_name,
            "invoice_number": invoice_number,
            "total": total,
            "due_date": due_date,
        },
        subject_override=f"Invoice {invoice_number} — ${total:.2f}",
        tags={"type": "invoice", "event": "created"},
        tenant_id=tenant_id,
    )


def notify_invoice_paid(invoice_number: str, total: float, member_email: str, member_name: str, tenant_id: str | None = None):
    """Send payment confirmation."""
    _render_and_send(
        to=member_email,
        template_name="invoice_paid.html",
        variables={
            "member_name": member_name,
            "invoice_number": invoice_number,
            "total": total,
        },
        subject_override=f"Payment Confirmed — Invoice {invoice_number}",
        tags={"type": "invoice", "event": "paid"},
        tenant_id=tenant_id,
    )


def notify_invoice_overdue(invoice_number: str, total: float, member_email: str, member_name: str, days_overdue: int, tenant_id: str | None = None):
    """Send overdue invoice reminder."""
    _render_and_send(
        to=member_email,
        template_name="invoice_overdue.html",
        variables={
            "member_name": member_name,
            "invoice_number": invoice_number,
            "total": total,
            "days_overdue": days_overdue,
        },
        subject_override=f"Overdue: Invoice {invoice_number} — ${total:.2f}",
        tags={"type": "invoice", "event": "overdue"},
        tenant_id=tenant_id,
    )


# ── Event Notifications ──────────────────────────────────────

def notify_event_registration(event_title: str, event_date: str, member_email: str, member_name: str, event_location: str = "", ticket_type: str = "", tenant_id: str | None = None):
    """Send event registration confirmation."""
    _render_and_send(
        to=member_email,
        template_name="event_registration.html",
        variables={
            "member_name": member_name,
            "event_title": event_title,
            "event_date": event_date,
            "event_location": event_location,
            "ticket_type": ticket_type,
        },
        subject_override=f"Registered: {event_title}",
        tags={"type": "event", "event": "registration"},
        tenant_id=tenant_id,
    )


def notify_event_reminder(event_title: str, event_date: str, event_location: str, member_email: str, member_name: str, tenant_id: str | None = None):
    """Send event reminder (24h before)."""
    _render_and_send(
        to=member_email,
        template_name="event_reminder.html",
        variables={
            "member_name": member_name,
            "event_title": event_title,
            "event_date": event_date,
            "event_location": event_location,
        },
        subject_override=f"Reminder: {event_title} — Tomorrow",
        tags={"type": "event", "event": "reminder"},
        tenant_id=tenant_id,
    )


# ── Membership Notifications ─────────────────────────────────

def notify_membership_renewal(member_email: str, member_name: str, expiry_date: str, days_left: int, membership_tier: str = "Member", tenant_id: str | None = None):
    """Send membership renewal reminder."""
    _render_and_send(
        to=member_email,
        template_name="membership_renewal.html",
        variables={
            "member_name": member_name,
            "expiry_date": expiry_date,
            "days_left": days_left,
            "membership_tier": membership_tier,
        },
        subject_override=f"Your membership expires in {days_left} days",
        tags={"type": "membership", "event": "renewal"},
        tenant_id=tenant_id,
    )


def notify_membership_welcome(member_email: str, member_name: str, tier: str, tenant_id: str | None = None):
    """Send welcome email to new member."""
    _render_and_send(
        to=member_email,
        template_name="membership_welcome.html",
        variables={
            "member_name": member_name,
            "membership_tier": tier,
        },
        subject_override=f"Welcome to the Association!",
        tags={"type": "membership", "event": "welcome"},
        tenant_id=tenant_id,
    )


# ── Generic Notifications ────────────────────────────────────

def notify_generic(to: str, title: str, message: str, action_url: str = "", action_label: str = "View Details", tenant_id: str | None = None, member_name: str = ""):
    """Send a generic notification email using the generic template."""
    _render_and_send(
        to=to,
        template_name="generic.html",
        variables={
            "member_name": member_name or "Member",
            "title": title,
            "message": message,
            "action_url": action_url,
            "action_label": action_label,
        },
        subject_override=title,
        tags={"type": "generic"},
        tenant_id=tenant_id,
    )
