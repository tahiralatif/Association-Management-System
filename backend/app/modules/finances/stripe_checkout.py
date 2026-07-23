"""Stripe checkout service — create payment sessions for invoices."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

log = logging.getLogger(__name__)

StripeKey = settings.STRIPE_SECRET_KEY


async def _stripe_request(method: str, path: str, **kwargs) -> dict | None:
    """Make a request to the Stripe API."""
    if not StripeKey:
        return None
    url = f"https://api.stripe.com/v1{path}"
    headers = {"Authorization": f"Bearer {StripeKey}"}
    async with httpx.AsyncClient() as client:
        resp = await client.request(method, url, headers=headers, **kwargs)
        if resp.status_code >= 400:
            log.error("Stripe API error %s: %s", resp.status_code, resp.text)
            return None
        return resp.json()


async def create_checkout_session(
    *,
    invoice_id: str,
    invoice_number: str,
    amount_cents: int,
    currency: str = "usd",
    customer_email: str,
    customer_name: str,
    success_url: str,
    cancel_url: str,
    metadata: dict[str, str] | None = None,
) -> dict[str, Any] | None:
    """Create a Stripe Checkout Session for an invoice payment.

    Returns {"session_id": "...", "url": "..."} or None on failure.
    """
    data = {
        "mode": "payment",
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][product_data][name]": f"Invoice {invoice_number}",
        "line_items[0][price_data][unit_amount]": str(amount_cents),
        "line_items[0][quantity]": "1",
        "customer_email": customer_email,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "metadata[invoice_id]": invoice_id,
        "metadata[invoice_number]": invoice_number,
    }
    if metadata:
        for k, v in metadata.items():
            data[f"metadata[{k}]"] = v

    result = await _stripe_request("POST", "/checkout/sessions", data=data)
    if result:
        return {"session_id": result["id"], "url": result["url"]}
    return None


async def retrieve_checkout_session(session_id: str) -> dict | None:
    """Retrieve a checkout session by ID."""
    return await _stripe_request("GET", f"/checkout/sessions/{session_id}")


async def create_payment_link(
    *,
    invoice_id: str,
    invoice_number: str,
    amount_cents: int,
    currency: str = "usd",
) -> dict[str, Any] | None:
    """Create a Stripe Payment Link (simpler alternative to checkout session)."""
    # First create a price
    price_data = {
        "currency": currency,
        "unit_amount": str(amount_cents),
        "product_data[name]": f"Invoice {invoice_number}",
    }
    price = await _stripe_request("POST", "/prices", data=price_data)
    if not price:
        return None

    # Then create a payment link
    link_data = {
        "line_items[0][price]": price["id"],
        "line_items[0][quantity]": "1",
        "metadata[invoice_id]": invoice_id,
    }
    result = await _stripe_request("POST", "/payment_links", data=link_data)
    if result:
        return {"payment_link_id": result["id"], "url": result["url"]}
    return None
