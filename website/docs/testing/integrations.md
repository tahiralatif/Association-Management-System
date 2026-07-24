---
sidebar_position: 27
title: Integrations
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Integrations

Test webhooks, Stripe, and integration health.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Integration Dashboard

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Integrations** in the sidebar
2. ✅ See integration dashboard with status of all connections

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/integrations/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Webhooks

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the webhooks section
2. ✅ See configured webhooks

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/integrations/webhooks \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Integration List

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/integrations/ \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Integrations](../modules/integrations)
- [Finances: Stripe](../modules/finances)
