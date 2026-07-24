---
sidebar_position: 24
title: Workflows Testing
---

# Testing: Workflows Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Workflows

```bash
curl -s "$API/workflows/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 17 workflows in the demo.

## Test 2: Workflow Statistics

```bash
curl -s "$API/workflows/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Workflow stats (active, paused, total runs).

## Test 3: List Templates

```bash
curl -s "$API/workflows/templates" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Pre-built workflow templates.

## Test 4: Create Workflow

```bash
curl -s -X POST "$API/workflows/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome New Members",
    "description": "Send welcome email and add to VIP group",
    "trigger": "member.created",
    "steps": [
      {
        "type": "send_email",
        "config": {
          "template": "welcome",
          "to": "{{trigger.member.email}}"
        }
      },
      {
        "type": "add_tag",
        "config": {
          "member_id": "{{trigger.member.id}}",
          "tag": "new-member"
        }
      },
      {
        "type": "wait",
        "config": {"duration": "7d"}
      },
      {
        "type": "send_email",
        "config": {
          "template": "followup",
          "to": "{{trigger.member.email}}"
        }
      }
    ]
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Workflow created.

## Test 5: Activate Workflow

```bash
WF_ID="workflow-uuid-here"
curl -s -X POST "$API/workflows/$WF_ID/activate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Workflow activated.

## Test 6: Trigger Workflow Manually

```bash
curl -s -X POST "$API/workflows/$WF_ID/trigger" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context": {"member_id": "member-uuid"}}' | python3 -m json.tool
```

**Expected:** `HTTP 200` — Workflow triggered.

## Test 7: View Run History

```bash
curl -s "$API/workflows/$WF_ID/runs" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Run history with status and timing.

## Test 8: Pause Workflow

```bash
curl -s -X POST "$API/workflows/$WF_ID/deactivate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Workflow paused.

## Test 9: Delete Workflow (Cleanup)

```bash
curl -s -X DELETE "$API/workflows/$WF_ID" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP: %{http_code}"
```

**Expected:** `HTTP 200/204` — Workflow deleted.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Workflows Module Tests ==="
for ep in \
  "List Workflows|GET|$API/workflows/" \
  "WF Stats|GET|$API/workflows/stats" \
  "WF Templates|GET|$API/workflows/templates"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Workflows Tests: $PASS passed, $FAIL failed"
```
