---
sidebar_position: 25
title: AI Engine Testing
---

# Testing: AI Engine Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List AI Models

```bash
curl -s "$API/ai/models" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — List of available AI models (may be empty if no models configured).

## Test 2: Chat with AI

```bash
curl -s -X POST "$API/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many members does the association have?",
    "context": "association_management"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200` — AI response based on member data.

## Test 3: Get AI Insights

```bash
curl -s "$API/ai/insights" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Cached insights or empty list.

## Test 4: Generate Insights

```bash
curl -s -X POST "$API/ai/insights" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"module": "members", "analysis_type": "summary"}' | python3 -m json.tool
```

**Expected:** `HTTP 200` — Generated insights about member data.

## Test 5: AI Usage Statistics

```bash
curl -s "$API/ai/usage" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — API call counts, token usage, costs.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== AI Engine Module Tests ==="
for ep in \
  "AI Models|GET|$API/ai/models" \
  "AI Insights|GET|$API/ai/insights" \
  "AI Usage|GET|$API/ai/usage"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done

# Chat (requires Groq API key)
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/ai/chat" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"message":"Hello","context":"general"}')
[ "$C" = "200" ] && echo "✅ AI Chat" && ((PASS++)) || echo "⚠️ AI Chat (HTTP $C - may need Groq key)" && ((FAIL++))

echo ""
echo "AI Tests: $PASS passed, $FAIL failed"
```
