---
sidebar_position: 24
title: Workflows
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Workflows

Test workflow creation, activation, triggers, and run history.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: List Workflows

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Workflows** in the sidebar
2. ✅ See 17 seeded workflows

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/workflows/ \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Workflow Templates

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the templates section
2. ✅ See pre-built workflow templates you can copy

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/workflows/templates \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Workflow Stats

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check workflow statistics
2. ✅ See active workflows, total runs, success rate

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/workflows/stats \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Workflows](../modules/workflows)
