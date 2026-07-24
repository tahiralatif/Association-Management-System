---
sidebar_position: 20
title: Events Testing
---

# Testing: Events Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Events

```bash
curl -s "$API/events/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 17 events in the demo.

## Test 2: Event Statistics

```bash
curl -s "$API/events/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Event counts by status, upcoming, etc.

## Test 3: Create Event

```bash
curl -s -X POST "$API/events/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workshop",
    "description": "A test event",
    "start_date": "2026-09-01T10:00:00Z",
    "end_date": "2026-09-01T16:00:00Z",
    "location": "Main Hall",
    "max_attendees": 50,
    "status": "draft"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Created event with UUID.

## Test 4: Publish Event

```bash
EVENT_ID="event-uuid-here"
curl -s -X POST "$API/events/$EVENT_ID/publish" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Status changed to `published`.

## Test 5: Create Ticket Type

```bash
curl -s -X POST "$API/events/$EVENT_ID/tickets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Early Bird",
    "price": 25.00,
    "quantity": 20,
    "sale_start": "2026-08-01T00:00:00Z",
    "sale_end": "2026-08-31T23:59:59Z"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Ticket type created.

## Test 6: Create Session

```bash
curl -s -X POST "$API/events/$EVENT_ID/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to AMS",
    "description": "Overview session",
    "start_time": "2026-09-01T10:00:00Z",
    "end_time": "2026-09-01T11:00:00Z"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Session created.

## Test 7: Cancel Event

```bash
curl -s -X DELETE "$API/events/$EVENT_ID" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP: %{http_code}"
```

**Expected:** `HTTP 200/204` — Event cancelled/deleted.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Events Module Tests ==="
for ep in "List Events|GET|$API/events/" "Event Stats|GET|$API/events/stats"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done

# Create
EID=$(curl -s -X POST "$API/events/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Event $(date +%s)\",\"description\":\"test\",\"start_date\":\"2026-09-01T10:00:00Z\",\"end_date\":\"2026-09-01T16:00:00Z\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$EID" ] && echo "✅ Create event" && ((PASS++)) || echo "❌ Create event" && ((FAIL++))

[ -n "$EID" ] && curl -s -X DELETE "$API/events/$EID" -H "Authorization: Bearer $TOKEN" > /dev/null
echo ""
echo "Events Tests: $PASS passed, $FAIL failed"
```
