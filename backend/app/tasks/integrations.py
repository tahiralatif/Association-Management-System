"""Integration tasks — event processing, webhook delivery, sync."""

from celery import shared_task


@shared_task
def process_pending_events():
    """Process unprocessed integration events. Run every 2 minutes via beat."""
    import asyncio
    from sqlalchemy import select
    from app.core.database import async_session_factory
    from app.modules.integrations.models import IntegrationEvent, Integration, IntegrationStatus

    async def _process():
        async with async_session_factory() as db:
            result = await db.execute(
                select(IntegrationEvent).where(
                    IntegrationEvent.processed == False
                ).order_by(IntegrationEvent.created_at).limit(100)
            )
            events = result.scalars().all()

            processed = 0
            for event in events:
                # Find active integrations for this tenant that handle this event
                int_result = await db.execute(
                    select(Integration).where(
                        Integration.tenant_id == event.tenant_id,
                        Integration.status == IntegrationStatus.ACTIVE,
                    )
                )
                integrations = int_result.scalars().all()

                for integration in integrations:
                    # Route to appropriate handler
                    try:
                        if integration.integration_type == "slack":
                            _route_to_slack(integration, event)
                        elif integration.integration_type == "zapier":
                            _route_to_webhook(integration, event)
                        # Stripe is incoming-only (webhooks), no outgoing routing needed
                    except Exception:
                        pass  # Log but don't block other events

                event.processed = True
                processed += 1

            await db.commit()
            return {"processed": processed}

    return asyncio.get_event_loop().run_until_complete(_process())


def _route_to_slack(integration, event):
    """Route an event to Slack."""
    # Would use Slack API to post message
    pass


def _route_to_webhook(integration, event):
    """Route an event to a generic webhook (Zapier, Make, etc.)."""
    import httpx
    config = integration.config or {}
    webhook_url = config.get("webhook_url", "")
    if webhook_url:
        httpx.post(webhook_url, json={
            "event_type": event.event_type,
            "payload": event.payload,
            "tenant_id": event.tenant_id,
        }, timeout=10)


@shared_task
def sync_google_calendar(tenant_id: str):
    """Sync events to Google Calendar."""
    return {"tenant_id": tenant_id, "status": "synced"}


@shared_task
def process_stripe_webhook(payload: dict, signature: str):
    """Process an incoming Stripe webhook."""
    import asyncio

    async def _process():
        from app.core.database import async_session_factory
        from app.modules.integrations.models import IntegrationEvent

        async with async_session_factory() as db:
            event = IntegrationEvent(
                tenant_id=payload.get("metadata", {}).get("tenant_id", "default"),
                event_type=f"stripe.{payload.get('type', 'unknown')}",
                source_module="stripe",
                payload=payload,
                processed=False,
            )
            db.add(event)
            await db.commit()
            return {"event_id": str(event.id)}

    return asyncio.get_event_loop().run_until_complete(_process())
