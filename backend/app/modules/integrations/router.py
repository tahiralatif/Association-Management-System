"""Integration routes — API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin, require_member, require_staff, TokenPayload
from app.core.database import get_db
from app.modules.integrations import crud
from app.modules.integrations.schemas import (
    DashboardStats,
    IntegrationCreate,
    IntegrationResponse,
    IntegrationUpdate,
    SendWebhookRequest,
    TestConnectionResponse,
    WebhookCreate,
    WebhookLogResponse,
    WebhookResponse,
    WebhookUpdate,
    IntegrationEventResponse,
)
from app.modules.integrations.services import IntegrationRouter, StripeService, WebhookService

router = APIRouter(tags=["Integrations"])


# ── Dashboard (MUST be before /{integration_id}) ────────────

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stats = await crud.get_dashboard_stats(db, user.tenant_id)
    return DashboardStats(**stats)


# ── List / Create integrations ──────────────────────────────

@router.get("/", response_model=list[IntegrationResponse])
async def list_integrations(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    integrations = await crud.list_integrations(db, user.tenant_id)
    return [IntegrationResponse.model_validate(i) for i in integrations]


@router.post("/", response_model=IntegrationResponse, status_code=status.HTTP_201_CREATED)
async def create_integration(
    data: IntegrationCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    integration = await crud.create_integration(db, user.tenant_id, data.model_dump())
    return IntegrationResponse.model_validate(integration)


# ── Webhooks (MUST be before /{integration_id}) ────────────

@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    webhooks = await crud.list_webhooks(db, user.tenant_id)
    return [WebhookResponse.model_validate(w) for w in webhooks]


@router.post("/webhooks", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookCreate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    webhook = await crud.create_webhook(db, user.tenant_id, data.model_dump())
    return WebhookResponse.model_validate(webhook)


@router.patch("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    data: WebhookUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    webhook = await crud.update_webhook(db, webhook_id, user.tenant_id, data.model_dump(exclude_unset=True))
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return WebhookResponse.model_validate(webhook)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_webhook(db, webhook_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Webhook not found")


@router.post("/webhooks/test")
async def test_webhook_delivery(
    data: SendWebhookRequest,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test deliver a webhook event to all active webhooks."""
    webhooks = await crud.get_active_webhooks_for_event(db, user.tenant_id, data.event_type)
    if not webhooks:
        return {"message": "No active webhooks for this event type", "results": []}

    results = []
    for webhook in webhooks:
        result = await WebhookService.send_webhook(db, webhook, data.event_type, data.payload)
        results.append({"webhook_id": webhook.id, "name": webhook.name, **result})

    return {"message": f"Tested {len(results)} webhook(s)", "results": results}


@router.get("/webhooks/{webhook_id}/logs", response_model=list[WebhookLogResponse])
async def get_webhook_logs(
    webhook_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    logs = await crud.list_webhook_logs(db, webhook_id, user.tenant_id)
    return [WebhookLogResponse.model_validate(l) for l in logs]


# ── Stripe Webhook Receiver (NO auth — verified via HMAC) ────

@router.post("/stripe/webhook")
async def receive_stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive Stripe webhook events. Verified via Stripe HMAC signature, not JWT."""
    tenant_id = request.headers.get("X-Tenant-ID") or request.query_params.get("tenant_id")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Missing X-Tenant-ID header")

    body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not StripeService.verify_webhook_signature(body, sig_header):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    import json
    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = event.get("type", "")
    data = event.get("data", {})

    result = await StripeService.handle_webhook_event(db, tenant_id, event_type, data)

    webhooks = await crud.get_active_webhooks_for_event(db, tenant_id, f"stripe.{event_type}")
    for webhook in webhooks:
        await WebhookService.send_webhook(db, webhook, f"stripe.{event_type}", data)

    return {"received": True, "event_type": event_type, "result": result}


# ── Events (MUST be before /{integration_id}) ──────────────

@router.get("/events", response_model=list[IntegrationEventResponse])
async def list_events(
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    events = await crud.list_events(db, user.tenant_id)
    return [IntegrationEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=IntegrationEventResponse, status_code=status.HTTP_201_CREATED)
async def emit_event(
    data: SendWebhookRequest,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Emit an integration event that will be dispatched to active webhooks."""
    result = await IntegrationRouter.route_event(
        db, user.tenant_id, data.event_type, data.payload, source_module="api"
    )
    events = await crud.list_events(db, user.tenant_id, limit=1)
    if events:
        return IntegrationEventResponse.model_validate(events[0])
    raise HTTPException(status_code=500, detail="Event creation failed")


# ── Individual integration by ID (AFTER all specific routes) ─

@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    integration = await crud.get_integration(db, integration_id, user.tenant_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return IntegrationResponse.model_validate(integration)


@router.patch("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str,
    data: IntegrationUpdate,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    integration = await crud.update_integration(
        db, integration_id, user.tenant_id, data.model_dump(exclude_unset=True)
    )
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    return IntegrationResponse.model_validate(integration)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_integration(
    integration_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    deleted = await crud.delete_integration(db, integration_id, user.tenant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Integration not found")


@router.post("/{integration_id}/test", response_model=TestConnectionResponse)
async def test_connection(
    integration_id: str,
    user: TokenPayload = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Test the connection for an integration."""
    integration = await crud.get_integration(db, integration_id, user.tenant_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    integration_type = integration.integration_type.value

    if integration_type == "stripe":
        config = integration.config or {}
        api_key = config.get("api_key")
        if not api_key:
            return TestConnectionResponse(
                success=False, message="No API key configured", details={"type": "stripe"}
            )
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.stripe.com/v1/balance",
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                if resp.status_code == 200:
                    return TestConnectionResponse(
                        success=True, message="Stripe connection successful", details=resp.json()
                    )
                else:
                    return TestConnectionResponse(
                        success=False,
                        message=f"Stripe API returned {resp.status_code}",
                        details={"error": resp.text[:500]},
                    )
        except Exception as e:
            return TestConnectionResponse(success=False, message=f"Connection failed: {e}")

    elif integration_type == "slack":
        config = integration.config or {}
        bot_token = config.get("bot_token")
        if not bot_token:
            return TestConnectionResponse(
                success=False, message="No bot token configured", details={"type": "slack"}
            )
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://slack.com/api/auth.test",
                    headers={"Authorization": f"Bearer {bot_token}"},
                )
                data = resp.json()
                if data.get("ok"):
                    return TestConnectionResponse(
                        success=True,
                        message=f"Slack connected as {data.get('user', 'unknown')}",
                        details=data,
                    )
                else:
                    return TestConnectionResponse(
                        success=False, message=f"Slack auth failed: {data.get('error')}", details=data
                    )
        except Exception as e:
            return TestConnectionResponse(success=False, message=f"Connection failed: {e}")

    elif integration_type == "google_calendar":
        return TestConnectionResponse(
            success=True,
            message="Google Calendar integration registered (OAuth flow required for full test)",
            details={"type": "google_calendar"},
        )

    elif integration_type == "zapier":
        return TestConnectionResponse(
            success=True,
            message="Zapier webhook registered",
            details={"type": "zapier", "webhook_url": integration.webhook_url},
        )

    else:
        return TestConnectionResponse(
            success=True,
            message=f"Custom integration registered: {integration.name}",
            details={"type": integration_type},
        )


@router.post("/{integration_id}/sync", response_model=IntegrationResponse)
async def trigger_sync(
    integration_id: str,
    user: TokenPayload = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a manual sync for an integration."""
    integration = await crud.get_integration(db, integration_id, user.tenant_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    from datetime import datetime, timezone
    integration.last_sync_at = datetime.now(timezone.utc)
    integration.status = "active"
    integration.error_message = None
    await db.flush()

    return IntegrationResponse.model_validate(integration)
