"""Stripe webhook handler for payment processing.

Handles incoming Stripe webhook events to mark invoices as paid,
record payments, and update related data.
"""

from __future__ import annotations

import logging
import hmac
import hashlib
import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.modules.finances.models import Invoice, InvoiceStatus, Payment, PaymentMethod

log = logging.getLogger(__name__)


def verify_stripe_signature(payload: bytes, sig_header: str, secret: str) -> bool:
    """Verify Stripe webhook HMAC-SHA256 signature."""
    if not secret or not sig_header:
        return False

    try:
        elements = dict(item.split("=", 1) for item in sig_header.split(","))
        timestamp = elements.get("t", "")
        signature = elements.get("v1", "")

        # Reject timestamps older than 5 minutes
        if abs(time.time() - int(timestamp)) > 300:
            log.warning("Stripe webhook timestamp too old: %s", timestamp)
            return False

        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected = hmac.new(
            secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)
    except Exception:
        log.exception("Stripe webhook signature verification failed")
        return False


async def handle_stripe_event(db: AsyncSession, event_type: str, data: dict) -> dict:
    """Process a verified Stripe webhook event.

    Returns dict with action taken: {"action": "payment_recorded", "invoice_id": "..."} or similar.
    """
    log.info("Processing Stripe event: %s", event_type)

    if event_type == "checkout.session.completed":
        return await _handle_checkout_completed(db, data)
    elif event_type == "checkout.session.expired":
        return await _handle_checkout_expired(db, data)
    elif event_type == "charge.refunded":
        return await _handle_charge_refunded(db, data)
    elif event_type == "payment_intent.payment_failed":
        return await _handle_payment_failed(db, data)
    else:
        log.info("Unhandled Stripe event type: %s", event_type)
        return {"action": "ignored", "event_type": event_type}


async def _handle_checkout_completed(db: AsyncSession, data: dict) -> dict:
    """Handle checkout.session.completed — mark invoice as paid."""
    session = data.get("object", {})
    metadata = session.get("metadata", {})
    invoice_id = metadata.get("invoice_id")
    payment_intent = session.get("payment_intent")
    customer_email = session.get("customer_details", {}).get("email", "")
    amount_total = session.get("amount_total", 0)  # in cents
    currency = session.get("currency", "usd")

    if not invoice_id:
        log.warning("checkout.session.completed missing invoice_id in metadata")
        return {"action": "skipped", "reason": "no_invoice_id"}

    # Find the invoice
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        log.error("Invoice %s not found for Stripe checkout", invoice_id)
        return {"action": "error", "reason": "invoice_not_found"}

    # Skip if already paid (idempotent)
    if invoice.status == InvoiceStatus.PAID:
        log.info("Invoice %s already paid, skipping", invoice.invoice_number)
        return {"action": "already_paid", "invoice_id": invoice_id}

    # Calculate amount in dollars
    amount_dollars = (amount_total or 0) / 100.0

    # Create payment record
    payment = Payment(
        tenant_id=invoice.tenant_id,
        invoice_id=invoice.id,
        member_id=invoice.member_id,
        amount=amount_dollars,
        currency=currency.upper(),
        payment_method=PaymentMethod.STRIPE,
        status="completed",
        stripe_charge_id=payment_intent,
        stripe_receipt_url=session.get("hosted_invoice_url") or session.get("receipt_url"),
        reference_number=session.get("id"),
        notes=f"Stripe Checkout Session: {session.get('id', '')}",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)

    # Update invoice
    invoice.amount_paid = float(invoice.amount_paid or 0) + amount_dollars
    invoice.stripe_payment_intent_id = payment_intent
    if invoice.amount_paid >= float(invoice.total):
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = datetime.now(timezone.utc)

    await db.flush()

    log.info(
        "Payment recorded for invoice %s: $%.2f via Stripe (session %s)",
        invoice.invoice_number, amount_dollars, session.get("id", ""),
    )

    # Send payment confirmation email (best-effort)
    try:
        from app.core.notifications import notify_invoice_paid
        from app.modules.members.models import MemberProfile, User
        from sqlalchemy import select as _sel

        if invoice.member_id:
            mp_result = await db.execute(
                _sel(MemberProfile).where(MemberProfile.id == invoice.member_id)
            )
            profile = mp_result.scalar_one_or_none()
            if profile:
                u_result = await db.execute(_sel(User).where(User.id == profile.user_id))
                user = u_result.scalar_one_or_none()
                if user:
                    name = f"{user.first_name} {user.last_name}"
                    notify_invoice_paid(
                        invoice.invoice_number, amount_dollars,
                        user.email, name,
                    )
    except Exception:
        pass  # Don't fail the webhook handler

    return {
        "action": "payment_recorded",
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number,
        "amount": amount_dollars,
    }


async def _handle_checkout_expired(db: AsyncSession, data: dict) -> dict:
    """Handle checkout.session.expired — log but don't change invoice status."""
    session = data.get("object", {})
    metadata = session.get("metadata", {})
    invoice_id = metadata.get("invoice_id")
    log.info("Stripe checkout expired for invoice %s", invoice_id)
    return {"action": "checkout_expired", "invoice_id": invoice_id}


async def _handle_charge_refunded(db: AsyncSession, data: dict) -> dict:
    """Handle charge.refunded — create a refund payment record."""
    charge = data.get("object", {})
    amount_refunded = (charge.get("amount_refunded", 0)) / 100.0
    payment_intent_id = charge.get("payment_intent")

    if not payment_intent_id:
        return {"action": "skipped", "reason": "no_payment_intent"}

    # Find the original payment
    result = await db.execute(
        select(Payment).where(Payment.stripe_charge_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        log.warning("Original payment not found for refund: %s", payment_intent_id)
        return {"action": "error", "reason": "original_payment_not_found"}

    # Update original payment status
    payment.status = "refunded"

    # Update invoice
    invoice_result = await db.execute(
        select(Invoice).where(Invoice.id == payment.invoice_id)
    )
    invoice = invoice_result.scalar_one_or_none()
    if invoice:
        invoice.amount_paid = max(0, float(invoice.amount_paid or 0) - amount_refunded)
        if invoice.status == InvoiceStatus.PAID:
            invoice.status = InvoiceStatus.REFUNDED

    await db.flush()
    log.info("Refund recorded: $%.2f for payment %s", amount_refunded, payment.id)
    return {"action": "refund_recorded", "amount": amount_refunded}


async def _handle_payment_failed(db: AsyncSession, data: dict) -> dict:
    """Handle payment_intent.payment_failed — log the failure."""
    intent = data.get("object", {})
    error = intent.get("last_payment_error", {})
    log.warning(
        "Stripe payment failed: %s (code: %s)",
        error.get("message", "unknown"),
        error.get("code", "unknown"),
    )
    return {"action": "payment_failed", "error": error.get("message", "unknown")}
