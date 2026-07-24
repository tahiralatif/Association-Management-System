---
sidebar_position: 23
title: Documents
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Documents

Test document upload, categories, versioning, and sharing.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: List Documents

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Documents** in the sidebar
2. ✅ See 28 seeded documents (reports, templates, policies, minutes)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/documents/ \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Categories

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check document categories
2. ✅ See organized categories (reports, templates, policies, etc.)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/documents/categories \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Document Stats

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check document statistics
2. ✅ See total documents, by category, recent uploads

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/documents/stats \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Documents](../modules/documents)
