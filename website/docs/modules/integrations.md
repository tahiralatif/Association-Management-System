---
sidebar_position: 15
title: Integrations
---

# Integrations Module

Connect AssocHub with external services via webhooks, Stripe, and sync APIs.

## Features

- **Webhooks:** HMAC-signed webhook delivery with retry logic
- **Stripe Integration:** Checkout sessions, payment webhooks, subscription management
- **External Sync:** Sync members and data with external CRMs
- **Integration Events:** Track all integration events and failures
- **Test Endpoints:** Send test webhook payloads
- **Dashboard:** Monitor integration health and event logs

## API Endpoints (12 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/integrations/` | List integrations | Staff+ |
| `POST` | `/integrations/` | Create integration | Admin |
| `GET` | `/integrations/{id}` | Get integration | Staff+ |
| `PUT` | `/integrations/{id}` | Update integration | Admin |
| `DELETE` | `/integrations/{id}` | Delete integration | Admin |
| `POST` | `/integrations/{id}/test` | Test integration | Staff+ |
| `GET` | `/integrations/webhooks` | List webhooks | Staff+ |
| `POST` | `/integrations/webhooks` | Create webhook | Staff+ |
| `PUT` | `/integrations/webhooks/{id}` | Update webhook | Staff+ |
| `DELETE` | `/integrations/webhooks/{id}` | Delete webhook | Admin |
| `POST` | `/integrations/webhooks/{id}/test` | Test webhook delivery | Staff+ |
| `GET` | `/integrations/dashboard` | Integration dashboard | Staff+ |

## Webhook Payload

```json
{
  "event": "member.created",
  "timestamp": "2026-07-24T05:00:00Z",
  "data": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com"
  }
}
```

## Supported Webhook Events

| Event | Trigger |
|---|---|
| `member.created` | New member registered |
| `member.updated` | Member profile updated |
| `member.deleted` | Member deleted |
| `invoice.created` | New invoice generated |
| `invoice.paid` | Payment received |
| `event.registered` | Member registered for event |
| `event.checked_in` | Member checked in at event |
| `election.vote_cast` | Vote recorded |
| `workflow.completed` | Workflow run finished |
| `workflow.failed` | Workflow run failed |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List integrations
curl -s "$API/integrations/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get integration dashboard
curl -s "$API/integrations/dashboard" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List webhooks
curl -s "$API/integrations/webhooks" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Integrations](../testing/integrations.md) for complete test scripts.
