---
sidebar_position: 22
title: Elections Testing
---

# Testing: Elections Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Elections

```bash
curl -s "$API/elections/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 16 elections in the demo.

## Test 2: Election Statistics

```bash
curl -s "$API/elections/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Election counts and statistics.

## Test 3: Create Election

```bash
curl -s -X POST "$API/elections/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Board Election 2026",
    "description": "Annual board member election",
    "start_date": "2026-09-01T00:00:00Z",
    "end_date": "2026-09-15T23:59:59Z",
    "quorum_percentage": 30,
    "voting_method": "ranked_choice"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Election created.

## Test 4: Add Position

```bash
ELECTION_ID="election-uuid-here"
curl -s -X POST "$API/elections/$ELECTION_ID/positions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "President",
    "description": "Association president",
    "max_candidates": 5
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Position created.

## Test 5: Open Nominations

```bash
curl -s -X POST "$API/elections/$ELECTION_ID/start-nominations" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Nominations opened.

## Test 6: Cast Vote

```bash
curl -s -X POST "$API/elections/$ELECTION_ID/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position_id": "position-uuid",
    "ranking": ["candidate-uuid-1", "candidate-uuid-2"]
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200` — Vote recorded (secret ballot).

## Test 7: Close Election

```bash
curl -s -X POST "$API/elections/$ELECTION_ID/close" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Election closed, results tabulated.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Elections Module Tests ==="
for ep in \
  "List Elections|GET|$API/elections/" \
  "Election Stats|GET|$API/elections/stats"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Elections Tests: $PASS passed, $FAIL failed"
```
