---
sidebar_position: 15
title: Integrations
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Integrations Module

Connect AssocHub to external services — Stripe, webhooks, and more.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Stripe Payments** — Accept credit card payments for memberships and event tickets.

**Webhooks** — Set up automatic notifications to other services when things happen in AssocHub.

**Integration Dashboard** — See which integrations are active and their health status.

### Try it now:

1. Click **Integrations** in the sidebar
2. View the integration dashboard
3. Check configured webhooks
4. See Stripe integration status

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (12)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/integrations/` | List integrations | Staff+ |
| `POST` | `/integrations/` | Create integration | Admin |
| `GET` | `/integrations/{id}` | Get integration | Staff+ |
| `PUT` | `/integrations/{id}` | Update integration | Admin |
| `DELETE` | `/integrations/{id}` | Delete integration | Admin |
| `GET` | `/integrations/{id}/status` | Health status | Staff+ |
| `POST` | `/integrations/{id}/test` | Test connection | Staff+ |
| `GET` | `/integrations/webhooks` | List webhooks | Staff+ |
| `POST` | `/integrations/webhooks` | Create webhook | Admin |
| `PUT` | `/integrations/webhooks/{id}` | Update webhook | Admin |
| `DELETE` | `/integrations/webhooks/{id}` | Delete webhook | Admin |
| `GET` | `/integrations/dashboard` | Integration dashboard | Staff+ |

### Webhook Event Types

| Event | Fires When |
|---|---|
| `member.created` | New member registered |
| `member.updated` | Member profile changed |
| `payment.received` | Invoice paid |
| `event.registered` | Member registered for event |
| `campaign.sent` | Email campaign sent |

### Example: Create a Webhook

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/integrations/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notification",
    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "events": ["member.created", "payment.received"],
    "is_active": true
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Integrations](../testing/integrations)
- [Finances: Stripe Payments](./finances)
