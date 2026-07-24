---
sidebar_position: 27
title: Integrations Testing
---

# Testing: Integrations Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Integrations

```bash
curl -s "$API/integrations/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Integration list (Stripe, webhooks, etc.).

## Test 2: Integration Dashboard

```bash
curl -s "$API/integrations/dashboard" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Integration health and event summary.

## Test 3: List Webhooks

```bash
curl -s "$API/integrations/webhooks" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Webhook list.

## Test 4: Create Webhook

```bash
curl -s -X POST "$API/integrations/webhooks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/webhook",
    "events": ["member.created", "invoice.paid"],
    "secret": "my-webhook-secret"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Webhook created with HMAC secret.

## Test 5: Test Webhook

```bash
WEBHOOK_ID="webhook-uuid-here"
curl -s -X POST "$API/integrations/webhooks/$WEBHOOK_ID/test" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Test payload sent.

## Test 6: List Integration Events

```bash
curl -s "$API/integrations/events" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Integration event log.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Integrations Module Tests ==="
for ep in \
  "List Integrations|GET|$API/integrations/" \
  "Integration Dashboard|GET|$API/integrations/dashboard" \
  "List Webhooks|GET|$API/integrations/webhooks"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Integrations Tests: $PASS passed, $FAIL failed"
```
