---
sidebar_position: 21
title: Communications Testing
---

# Testing: Communications Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Campaigns

```bash
curl -s "$API/communications/campaigns" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 3 campaigns in the demo.

## Test 2: Create Campaign

```bash
curl -s -X POST "$API/communications/campaigns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Newsletter",
    "subject": "Monthly Update",
    "body": "<h1>Hello {{ member.first_name }}!</h1><p>Welcome to our newsletter.</p>",
    "audience": "all_members",
    "status": "draft"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Campaign created.

## Test 3: Duplicate Campaign

```bash
CAMPAIGN_ID="campaign-uuid-here"
curl -s -X POST "$API/communications/campaigns/$CAMPAIGN_ID/duplicate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Duplicated campaign.

## Test 4: List Announcements

```bash
curl -s "$API/communications/announcements" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Announcements list.

## Test 5: Create Announcement

```bash
curl -s -X POST "$API/communications/announcements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Important Update",
    "content": "System maintenance scheduled for this weekend.",
    "priority": "high",
    "pinned": true
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Announcement created.

## Test 6: List Surveys

```bash
curl -s "$API/communications/surveys" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Survey list.

## Test 7: List Email Templates

```bash
curl -s "$API/communications/templates" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Email template list.

## Test 8: Send Logs

```bash
curl -s "$API/communications/send-logs" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Send log history.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Communications Module Tests ==="
for ep in \
  "List Campaigns|GET|$API/communications/campaigns" \
  "List Announcements|GET|$API/communications/announcements" \
  "List Surveys|GET|$API/communications/surveys" \
  "List Templates|GET|$API/communications/templates" \
  "Send Logs|GET|$API/communications/send-logs"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Communications Tests: $PASS passed, $FAIL failed"
```
