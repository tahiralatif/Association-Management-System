---
sidebar_position: 19
title: Finances Testing
---

# Testing: Finances Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Invoices

```bash
curl -s "$API/finances/finances/invoices" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — 3 invoices in the demo.

## Test 2: Invoice Statistics

```bash
curl -s "$API/finances/finances/invoices/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Revenue, outstanding, paid counts.

## Test 3: Create Invoice

```bash
curl -s -X POST "$API/finances/finances/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "member-uuid-here",
    "amount": 250.00,
    "currency": "USD",
    "description": "Annual membership dues",
    "due_date": "2026-08-15",
    "line_items": [
      {"description": "Annual Dues", "quantity": 1, "unit_price": 200.00},
      {"description": "Donation", "quantity": 1, "unit_price": 50.00}
    ]
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Created invoice with auto-numbered ID.

## Test 4: List Budgets

```bash
curl -s "$API/finances/finances/budgets" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — List of budgets.

## Test 5: List Expenses

```bash
curl -s "$API/finances/finances/expenses" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Expense list with approval status.

## Test 6: List Dues Structures

```bash
curl -s "$API/finances/finances/dues" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Dues structure list.

## Test 7: Financial Reports

```bash
curl -s "$API/finances/finances/reports" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Revenue and expense reports.

## Test 8: Revenue Summary

```bash
curl -s "$API/finances/finances/reports/summary" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Revenue summary data.

## Test 9: Payment History

```bash
curl -s "$API/finances/finances/payments/history" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Payment history list.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Finances Module Tests ==="

test_pass() { echo "✅ $1"; ((PASS++)); }
test_fail() { echo "❌ $1 (HTTP $2)"; ((FAIL++)); }

endpoints=(
  "List Invoices|GET|$API/finances/finances/invoices"
  "Invoice Stats|GET|$API/finances/finances/invoices/stats"
  "List Expenses|GET|$API/finances/finances/expenses"
  "List Budgets|GET|$API/finances/finances/budgets"
  "List Dues|GET|$API/finances/finances/dues"
  "Reports|GET|$API/finances/finances/reports"
  "Revenue Summary|GET|$API/finances/finances/reports/summary"
  "Payment History|GET|$API/finances/finances/payments/history"
)

for ep in "${endpoints[@]}"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && test_pass "$name" || test_fail "$name" "$C"
done

echo ""
echo "Finances Tests: $PASS passed, $FAIL failed"
```
