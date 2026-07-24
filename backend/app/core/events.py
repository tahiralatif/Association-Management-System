"""Auto-event emitter — fires integration events when data changes.

Drop this into any module's CRUD/router to trigger webhooks automatically.
Events are dispatched asynchronously so they never block the main operation.
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Module → event type prefix mapping
MODULE_EVENTS = {
    "members": {
        "create": "member.created",
        "update": "member.updated",
        "delete": "member.deleted",
    },
    "events": {
        "create": "event.created",
        "update": "event.updated",
        "delete": "event.deleted",
    },
    "finances": {
        "create_invoice": "invoice.created",
        "update_invoice": "invoice.updated",
        "pay_invoice": "invoice.paid",
        "create_expense": "expense.created",
        "create_budget": "budget.created",
    },
    "communications": {
        "create_campaign": "campaign.created",
        "send_campaign": "campaign.sent",
        "create_announcement": "announcement.created",
    },
    "elections": {
        "create": "election.created",
        "vote": "election.vote_cast",
        "complete": "election.completed",
    },
    "documents": {
        "create": "document.created",
        "upload": "document.uploaded",
        "delete": "document.deleted",
    },
    "workflows": {
        "create": "workflow.created",
        "trigger": "workflow.triggered",
        "complete": "workflow.completed",
        "fail": "workflow.failed",
    },
}


async def emit_event(db, tenant_id: str, event_type: str, payload: dict, source_module: str = "system"):
    """Emit an integration event asynchronously.
    
    Records the event in the DB and dispatches webhooks in the background.
    Never blocks the main operation — fire and forget.
    """
    try:
        from app.modules.integrations.crud import create_integration_event, get_active_webhooks_for_event
        from app.modules.integrations.services import WebhookService

        # Record the event
        event = await create_integration_event(db, tenant_id, event_type, source_module, payload)
        await db.commit()

        # Find matching webhooks and dispatch in background
        webhooks = await get_active_webhooks_for_event(db, tenant_id, event_type)

        for webhook in webhooks:
            asyncio.create_task(
                _deliver_webhook(tenant_id, webhook, event_type, payload)
            )

        if webhooks:
            logger.info(f"Event {event_type} recorded, {len(webhooks)} webhook(s) queued for delivery")
        return {"event_id": str(event.id), "webhooks_queued": len(webhooks)}

    except Exception as e:
        # Never break the main flow due to webhook errors
        logger.warning(f"Event emission failed for {event_type}: {e}")
        return {"error": str(e)}


async def _deliver_webhook(tenant_id, webhook, event_type: str, payload: dict):
    """Deliver a webhook in the background with its own DB session."""
    try:
        from app.core.database import async_session_factory
        async with async_session_factory() as db:
            await WebhookService.send_webhook(db, webhook, event_type, payload)
            await db.commit()
    except Exception as e:
        logger.warning(f"Webhook delivery failed for {webhook.id}: {e}")


async def emit_member_event(db, tenant_id: str, action: str, member_data: dict):
    """Emit a member-related event."""
    event_type = MODULE_EVENTS["members"].get(action)
    if event_type:
        await emit_event(db, tenant_id, event_type, member_data, "members")


async def emit_finance_event(db, tenant_id: str, action: str, finance_data: dict):
    """Emit a finance-related event."""
    event_type = MODULE_EVENTS["finances"].get(action)
    if event_type:
        await emit_event(db, tenant_id, event_type, finance_data, "finances")


async def emit_event_event(db, tenant_id: str, action: str, event_data: dict):
    """Emit an events-module event."""
    event_type = MODULE_EVENTS["events"].get(action)
    if event_type:
        await emit_event(db, tenant_id, event_type, event_data, "events")
