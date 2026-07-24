"""Integration services — Stripe, Webhooks, Event routing."""

import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.modules.integrations import crud

logger = logging.getLogger(__name__)


# ── Stripe Service ───────────────────────────────────────────

class StripeService:
    """Handles Stripe webhook verification and event processing."""

    STRIPE_EVENTS_MAP = {
        "payment_intent.succeeded": "payment.completed",
        "invoice.paid": "invoice.paid",
        "invoice.payment_failed": "invoice.payment_failed",
        "customer.subscription.created": "subscription.created",
        "customer.subscription.updated": "subscription.updated",
        "customer.subscription.deleted": "subscription.deleted",
        "charge.refunded": "charge.refunded",
    }

    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str) -> bool:
        """Verify Stripe webhook HMAC signature.

        Stripe sends: stripe-signature header with t=<timestamp>,v1=<signature>
        """
        if not settings.STRIPE_WEBHOOK_SECRET:
            logger.warning("STRIPE_WEBHOOK_SECRET not configured — skipping signature verification")
            return True

        elements = dict(item.split("=", 1) for item in sig_header.split(","))
        timestamp = elements.get("t")
        signature = elements.get("v1")

        if not timestamp or not signature:
            return False

        # Reject if timestamp is too old (>5 minutes)
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > 300:
                return False
        except ValueError:
            return False

        signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
        expected = hmac.new(
            settings.STRIPE_WEBHOOK_SECRET.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    @staticmethod
    async def handle_webhook_event(db, tenant_id: str, event_type: str, data: dict) -> dict:
        """Route a Stripe event to the appropriate internal action.

        Returns a summary of what was done.
        """
        result = {"event_type": event_type, "actions": []}

        # Record the integration event
        await crud.create_integration_event(
            db,
            tenant_id=tenant_id,
            event_type=f"stripe.{event_type}",
            source_module="stripe",
            payload=data,
        )

        if event_type == "payment_intent.succeeded":
            pi = data.get("object", {})
            result["actions"].append({
                "action": "payment_recorded",
                "payment_intent_id": pi.get("id"),
                "amount": pi.get("amount", 0) / 100,  # cents to dollars
                "currency": pi.get("currency", "usd"),
            })

        elif event_type == "invoice.paid":
            invoice = data.get("object", {})
            result["actions"].append({
                "action": "invoice_marked_paid",
                "invoice_id": invoice.get("id"),
                "amount_paid": invoice.get("amount_paid", 0) / 100,
                "customer": invoice.get("customer"),
            })

        elif event_type == "invoice.payment_failed":
            invoice = data.get("object", {})
            result["actions"].append({
                "action": "invoice_payment_failed",
                "invoice_id": invoice.get("id"),
                "customer": invoice.get("customer"),
                "attempt_count": invoice.get("attempt_count", 0),
            })

        elif event_type.startswith("customer.subscription."):
            subscription = data.get("object", {})
            result["actions"].append({
                "action": f"subscription_{event_type.split('.')[-1]}",
                "subscription_id": subscription.get("id"),
                "customer": subscription.get("customer"),
                "status": subscription.get("status"),
            })

        elif event_type == "charge.refunded":
            charge = data.get("object", {})
            result["actions"].append({
                "action": "charge_refunded",
                "charge_id": charge.get("id"),
                "amount_refunded": charge.get("amount_refunded", 0) / 100,
                "customer": charge.get("customer"),
            })

        else:
            result["actions"].append({"action": "unhandled_stripe_event", "event_type": event_type})

        return result


# ── Webhook Service ──────────────────────────────────────────

class WebhookService:
    """Send outgoing webhooks with HMAC signing and retry logic."""

    @staticmethod
    def _sign_payload(payload: str, secret: str) -> str:
        """Create HMAC-SHA256 signature for webhook payload."""
        return hmac.new(
            secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
        ).hexdigest()

    @staticmethod
    async def send_webhook(db, webhook, event_type: str, payload: dict) -> dict:
        """Send an outgoing webhook with signing and retry.

        Returns delivery result dict.
        """
        body = json.dumps({
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        })

        headers = {"Content-Type": "application/json"}
        if webhook.secret:
            signature = WebhookService._sign_payload(body, webhook.secret)
            headers["X-Webhook-Signature"] = f"sha256={signature}"

        last_error = None
        status_code = None
        response_text = None

        for attempt in range(1, webhook.retry_count + 1):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(webhook.url, content=body, headers=headers)
                    status_code = resp.status_code
                    response_text = resp.text[:2000]

                    if 200 <= resp.status_code < 300:
                        # Log success
                        await crud.create_webhook_log(db, {
                            "webhook_id": webhook.id,
                            "tenant_id": webhook.tenant_id,
                            "event_type": event_type,
                            "payload": payload,
                            "response_status": resp.status_code,
                            "response_body": response_text,
                            "success": True,
                            "attempts": attempt,
                        })
                        return {
                            "success": True,
                            "status_code": resp.status_code,
                            "attempts": attempt,
                        }

                    last_error = f"HTTP {resp.status_code}: {response_text[:200]}"

            except httpx.RequestError as e:
                last_error = str(e)
                status_code = None

            # Wait before retry (exponential backoff)
            if attempt < webhook.retry_count:
                import asyncio
                await asyncio.sleep(min(2 ** attempt, 30))

        # All retries exhausted — log failure
        await crud.create_webhook_log(db, {
            "webhook_id": webhook.id,
            "tenant_id": webhook.tenant_id,
            "event_type": event_type,
            "payload": payload,
            "response_status": status_code,
            "response_body": last_error or "Unknown error",
            "success": False,
            "attempts": webhook.retry_count,
        })

        return {
            "success": False,
            "error": last_error,
            "attempts": webhook.retry_count,
        }

    @staticmethod
    async def process_pending_events(db, tenant_id: str) -> dict:
        """Process unprocessed integration events by dispatching to active webhooks."""
        events = await crud.list_unprocessed_events(db, tenant_id)
        results = {"processed": 0, "dispatched": 0, "errors": []}

        for event in events:
            # Find matching webhooks
            webhooks = await crud.get_active_webhooks_for_event(db, tenant_id, event.event_type)

            for webhook in webhooks:
                try:
                    result = await WebhookService.send_webhook(db, webhook, event.event_type, event.payload or {})
                    if result["success"]:
                        results["dispatched"] += 1
                except Exception as e:
                    results["errors"].append({"event_id": event.id, "webhook_id": webhook.id, "error": str(e)})

            await crud.mark_event_processed(db, event.id)
            results["processed"] += 1

        return results


# ── Integration Router ───────────────────────────────────────

class IntegrationRouter:
    """Routes events to the appropriate integration handlers."""

    @staticmethod
    async def route_event(db, tenant_id: str, event_type: str, payload: dict, source_module: str) -> dict:
        """Route an internal event to integration handlers.

        Webhooks are dispatched in the background so they don't block the API.
        """
        # Record the event
        event = await crud.create_integration_event(db, tenant_id, event_type, source_module, payload)
        await db.commit()  # Commit so event is visible to background tasks

        # Find matching webhooks (fire-and-forget in background)
        webhooks = await crud.get_active_webhooks_for_event(db, tenant_id, event_type)

        import asyncio
        for webhook in webhooks:
            # Dispatch each webhook as a background task — never block the API
            asyncio.create_task(
                IntegrationRouter._deliver_webhook(webhook, event_type, payload, tenant_id, event.id)
            )

        # Route to specific integration handlers
        try:
            slack_integration = await crud.get_integration_by_type(db, tenant_id, "slack")
            if slack_integration and slack_integration.status.value == "active":
                asyncio.create_task(
                    IntegrationRouter._notify_slack(slack_integration, event_type, payload)
                )
        except Exception:
            pass

        return {
            "event_id": event.id,
            "webhooks_dispatched": len(webhooks),
            "results": [],  # Background — results not available synchronously
        }

    @staticmethod
    async def _deliver_webhook(webhook, event_type: str, payload: dict, tenant_id: str, event_id: str):
        """Deliver a single webhook in the background."""
        try:
            from app.core.database import async_session_factory
            async with async_session_factory() as db:
                await WebhookService.send_webhook(db, webhook, event_type, payload)
                await db.commit()
        except Exception as e:
            logger.error(f"Webhook delivery failed for {webhook.id}: {e}")

    @staticmethod
    async def _notify_slack(integration, event_type: str, payload: dict):
        """Send a notification to Slack via incoming webhook URL."""
        config = integration.config or {}
        webhook_url = config.get("webhook_url") or integration.webhook_url
        if not webhook_url:
            return

        message = {
            "text": f"*AssocHub Event*: `{event_type}`",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*{event_type}*\n```{json.dumps(payload, indent=2)[:2000]}```",
                    },
                }
            ],
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(webhook_url, json=message)
        except Exception as e:
            logger.error(f"Slack notification failed: {e}")
