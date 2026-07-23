"""Integration and webhook CRUD — database operations."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.integrations.models import (
    Integration,
    IntegrationEvent,
    IntegrationStatus,
    IntegrationType,
    Webhook,
    WebhookLog,
)


# ── Integrations ─────────────────────────────────────────────

async def list_integrations(db: AsyncSession, tenant_id: str) -> list[Integration]:
    result = await db.execute(
        select(Integration).where(Integration.tenant_id == tenant_id).order_by(Integration.created_at.desc())
    )
    return list(result.scalars().all())


async def get_integration(db: AsyncSession, integration_id: str, tenant_id: str) -> Integration | None:
    result = await db.execute(
        select(Integration).where(Integration.id == integration_id, Integration.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def get_integration_by_type(
    db: AsyncSession, tenant_id: str, integration_type: str
) -> Integration | None:
    result = await db.execute(
        select(Integration).where(
            Integration.tenant_id == tenant_id,
            Integration.integration_type == integration_type,
        )
    )
    return result.scalar_one_or_none()


async def create_integration(db: AsyncSession, tenant_id: str, data: dict) -> Integration:
    integration = Integration(tenant_id=tenant_id, **data)
    db.add(integration)
    await db.flush()
    return integration


async def update_integration(
    db: AsyncSession, integration_id: str, tenant_id: str, updates: dict
) -> Integration | None:
    integration = await get_integration(db, integration_id, tenant_id)
    if not integration:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(integration, key):
            setattr(integration, key, value)
    await db.flush()
    return integration


async def delete_integration(db: AsyncSession, integration_id: str, tenant_id: str) -> bool:
    integration = await get_integration(db, integration_id, tenant_id)
    if not integration:
        return False
    await db.delete(integration)
    await db.flush()
    return True


# ── Webhooks ─────────────────────────────────────────────────

async def list_webhooks(db: AsyncSession, tenant_id: str) -> list[Webhook]:
    result = await db.execute(
        select(Webhook).where(Webhook.tenant_id == tenant_id).order_by(Webhook.created_at.desc())
    )
    return list(result.scalars().all())


async def get_webhook(db: AsyncSession, webhook_id: str, tenant_id: str) -> Webhook | None:
    result = await db.execute(
        select(Webhook).where(Webhook.id == webhook_id, Webhook.tenant_id == tenant_id)
    )
    return result.scalar_one_or_none()


async def get_active_webhooks_for_event(
    db: AsyncSession, tenant_id: str, event_type: str
) -> list[Webhook]:
    """Get active webhooks subscribed to a given event type."""
    result = await db.execute(
        select(Webhook).where(
            Webhook.tenant_id == tenant_id,
            Webhook.is_active == True,
        )
    )
    all_active = list(result.scalars().all())
    # Filter by event subscription (empty events list means subscribe to all)
    return [
        wh for wh in all_active
        if not wh.events or event_type in wh.events
    ]


async def create_webhook(db: AsyncSession, tenant_id: str, data: dict) -> Webhook:
    webhook = Webhook(tenant_id=tenant_id, **data)
    db.add(webhook)
    await db.flush()
    return webhook


async def update_webhook(
    db: AsyncSession, webhook_id: str, tenant_id: str, updates: dict
) -> Webhook | None:
    webhook = await get_webhook(db, webhook_id, tenant_id)
    if not webhook:
        return None
    for key, value in updates.items():
        if value is not None and hasattr(webhook, key):
            setattr(webhook, key, value)
    await db.flush()
    return webhook


async def delete_webhook(db: AsyncSession, webhook_id: str, tenant_id: str) -> bool:
    webhook = await get_webhook(db, webhook_id, tenant_id)
    if not webhook:
        return False
    await db.delete(webhook)
    await db.flush()
    return True


# ── Webhook Logs ─────────────────────────────────────────────

async def create_webhook_log(db: AsyncSession, data: dict) -> WebhookLog:
    log = WebhookLog(**data)
    db.add(log)
    await db.flush()
    return log


async def list_webhook_logs(
    db: AsyncSession, webhook_id: str, tenant_id: str, limit: int = 50
) -> list[WebhookLog]:
    result = await db.execute(
        select(WebhookLog)
        .where(WebhookLog.webhook_id == webhook_id, WebhookLog.tenant_id == tenant_id)
        .order_by(WebhookLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_tenant_webhook_logs(
    db: AsyncSession, tenant_id: str, limit: int = 50
) -> list[WebhookLog]:
    result = await db.execute(
        select(WebhookLog)
        .where(WebhookLog.tenant_id == tenant_id)
        .order_by(WebhookLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Integration Events ───────────────────────────────────────

async def create_integration_event(
    db: AsyncSession, tenant_id: str, event_type: str, source_module: str, payload: dict
) -> IntegrationEvent:
    event = IntegrationEvent(
        tenant_id=tenant_id,
        event_type=event_type,
        source_module=source_module,
        payload=payload,
    )
    db.add(event)
    await db.flush()
    return event


async def list_unprocessed_events(
    db: AsyncSession, tenant_id: str, limit: int = 100
) -> list[IntegrationEvent]:
    result = await db.execute(
        select(IntegrationEvent)
        .where(IntegrationEvent.tenant_id == tenant_id, IntegrationEvent.processed == False)
        .order_by(IntegrationEvent.created_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def mark_event_processed(db: AsyncSession, event_id: str) -> None:
    event = await db.get(IntegrationEvent, event_id)
    if event:
        event.processed = True
        await db.flush()


async def list_events(
    db: AsyncSession, tenant_id: str, limit: int = 50
) -> list[IntegrationEvent]:
    result = await db.execute(
        select(IntegrationEvent)
        .where(IntegrationEvent.tenant_id == tenant_id)
        .order_by(IntegrationEvent.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ── Dashboard Stats ──────────────────────────────────────────

async def get_dashboard_stats(db: AsyncSession, tenant_id: str) -> dict:
    now = datetime.now(timezone.utc)
    recent_threshold = now - timedelta(days=7)

    # Total integrations
    total = await db.execute(
        select(func.count()).select_from(Integration).where(Integration.tenant_id == tenant_id)
    )
    total_integrations = total.scalar() or 0

    # Active integrations
    active = await db.execute(
        select(func.count())
        .select_from(Integration)
        .where(Integration.tenant_id == tenant_id, Integration.status == IntegrationStatus.ACTIVE)
    )
    active_integrations = active.scalar() or 0

    # Failed integrations
    failed = await db.execute(
        select(func.count())
        .select_from(Integration)
        .where(Integration.tenant_id == tenant_id, Integration.status == IntegrationStatus.ERROR)
    )
    failed_integrations = failed.scalar() or 0

    # Recent events (last 7 days)
    recent_events = await db.execute(
        select(func.count())
        .select_from(IntegrationEvent)
        .where(
            IntegrationEvent.tenant_id == tenant_id,
            IntegrationEvent.created_at >= recent_threshold,
        )
    )
    recent_events_count = recent_events.scalar() or 0

    # Recent webhook deliveries (last 7 days)
    recent_deliveries = await db.execute(
        select(func.count())
        .select_from(WebhookLog)
        .where(
            WebhookLog.tenant_id == tenant_id,
            WebhookLog.created_at >= recent_threshold,
        )
    )
    recent_deliveries_count = recent_deliveries.scalar() or 0

    return {
        "total_integrations": total_integrations,
        "active_integrations": active_integrations,
        "failed_integrations": failed_integrations,
        "recent_events": recent_events_count,
        "recent_webhook_deliveries": recent_deliveries_count,
    }
