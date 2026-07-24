---
sidebar_position: 21
title: Communications
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Communications

Test email campaigns, announcements, and surveys.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Announcements

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Communications** in the sidebar
2. Browse the announcements
3. ✅ See 26 seeded announcements (some pinned)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/communications/announcements \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Campaigns

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the campaigns section
2. ✅ See email campaigns with sent/open/click stats

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/communications/campaigns \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Surveys

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the surveys section
2. ✅ See 4 seeded surveys (NPS, event feedback, member satisfaction)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/communications/surveys \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 4: Email Templates

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the templates section
2. ✅ See reusable email templates

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/communications/templates \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Communications](../modules/communications)
- [Testing: Members](./members)
