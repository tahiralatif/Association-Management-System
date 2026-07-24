---
sidebar_position: 26
title: Analytics
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Analytics

Test dashboards, reports, and data export.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Analytics Overview

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Analytics** in the sidebar
2. ✅ See overview with member, financial, and event stats

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/analytics/overview \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Dashboards

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the dashboards section
2. ✅ See pre-built dashboard views

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/analytics/dashboards \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Reports

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the reports section
2. ✅ See available reports

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/analytics/reports \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Analytics](../modules/analytics)
- [Dashboard](../modules/dashboard)
