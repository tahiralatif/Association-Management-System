---
sidebar_position: 23
title: Documents Testing
---

# Testing: Documents Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Documents

```bash
curl -s "$API/documents/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 8 documents in the demo.

## Test 2: Document Statistics

```bash
curl -s "$API/documents/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Document counts by category, size, etc.

## Test 3: List Categories

```bash
curl -s "$API/documents/categories" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Category list (bylaws, minutes, reports, etc.).

## Test 4: Upload Document

```bash
echo "Test document content" > /tmp/test-doc.txt
curl -s -X POST "$API/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-doc.txt" \
  -F "title=Test Document" \
  -F "category=reports" \
  -F "description=A test document" | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Document uploaded with ID.

## Test 5: Add Comment

```bash
DOC_ID="document-uuid-here"
curl -s -X POST "$API/documents/$DOC_ID/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "This is a test comment"}' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Comment added.

## Test 6: List Comments

```bash
curl -s "$API/documents/$DOC_ID/comments" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Comment list.

## Test 7: Share Document

```bash
curl -s -X POST "$API/documents/$DOC_ID/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "member-uuid", "permission": "read"}' | python3 -m json.tool
```

**Expected:** `HTTP 200` — Document shared.

## Test 8: Delete Document (Cleanup)

```bash
curl -s -X DELETE "$API/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP: %{http_code}"
```

**Expected:** `HTTP 200/204` — Document deleted.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Documents Module Tests ==="
for ep in \
  "List Documents|GET|$API/documents/" \
  "Document Stats|GET|$API/documents/stats" \
  "List Categories|GET|$API/documents/categories"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Documents Tests: $PASS passed, $FAIL failed"
```
