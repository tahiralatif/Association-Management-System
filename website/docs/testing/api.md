---
sidebar_position: 28
title: API Testing
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: API

Test pagination, filtering, error handling, and authentication.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Authentication

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Login
curl -s -X POST https://ams.14.jugaar.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"Demo1234!","tenant_id":"demo-association"}'

# Get user info
curl -s https://ams.14.jugaar.ai/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Pagination

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# First page
curl -s "https://ams.14.jugaar.ai/api/v1/members/?page=1&per_page=10" \
  -H "Authorization: Bearer $TOKEN"

# Second page
curl -s "https://ams.14.jugaar.ai/api/v1/members/?page=2&per_page=10" \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Error Handling

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# 401 — No token
curl -s -o /dev/null -w "%{http_code}" https://ams.14.jugaar.ai/api/v1/members/
# Expected: 401

# 404 — Not found
curl -s -o /dev/null -w "%{http_code}" https://ams.14.jugaar.ai/api/v1/members/nonexistent \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404

# 422 — Validation error
curl -s -o /dev/null -w "%{http_code}" -X POST https://ams.14.jugaar.ai/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}'
# Expected: 422
```

</TabItem>
</Tabs>

## Test 4: Trailing Slash

<Tabs>
<TabItem value="hard" label="🔵 Advanced — API / Code">

:::warning
All list endpoints require a trailing slash!
:::

```bash
# ✅ Correct — trailing slash
curl -s -o /dev/null -w "%{http_code}" https://ams.14.jugaar.ai/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200

# ❌ Wrong — no trailing slash (returns 307 redirect)
curl -s -o /dev/null -w "%{http_code}" https://ams.14.jugaar.ai/api/v1/members \
  -H "Authorization: Bearer $TOKEN"
# Expected: 307
```

</TabItem>
</Tabs>

## Test 5: Health Check

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to `https://ams.14.jugaar.ai/health`
2. ✅ See JSON with service status

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/health | python3 -m json.tool
```

</TabItem>
</Tabs>

---

## Expected HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `401` | Not authenticated |
| `403` | Forbidden (wrong role) |
| `404` | Not found |
| `422` | Validation error |
| `307` | Redirect (missing trailing slash) |

---

## Related

- [API Reference](../api-reference)
- [Troubleshooting](../troubleshooting)
