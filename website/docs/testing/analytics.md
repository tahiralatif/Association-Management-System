---
sidebar_position: 26
title: Analytics Testing
---

# Testing: Analytics Module

## Prerequisites

```bash
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: Analytics Overview

```bash
curl -s "$API/analytics/overview" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Aggregated metrics:
```json
{
  "total_members": 23,
  "active_members": 23,
  "total_revenue": 45000.00,
  "monthly_recurring": 3750.00,
  "total_events": 17,
  "upcoming_events": 5
}
```

## Test 2: List Dashboards

```bash
curl -s "$API/analytics/dashboards" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Dashboard list.

## Test 3: Create Dashboard

```bash
curl -s -X POST "$API/analytics/dashboards" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Executive Summary",
    "description": "Key metrics for leadership",
    "widgets": [
      {"type": "kpi_card", "config": {"metric": "total_members"}},
      {"type": "kpi_card", "config": {"metric": "total_revenue"}},
      {"type": "revenue_chart", "config": {"period": "12m"}}
    ]
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Dashboard created.

## Test 4: List Reports

```bash
curl -s "$API/analytics/reports" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Report list.

## Test 5: Export Report

```bash
curl -s "$API/analytics/reports/report-id/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" -o report-export.csv
echo "Exported $(wc -l < report-export.csv) lines"
```

**Expected:** `HTTP 200` — CSV file.

## Test 6: KPI Time Series

```bash
curl -s "$API/analytics/kpis?metric=members&period=30d" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Time-series data.

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Analytics Module Tests ==="
for ep in \
  "Analytics Overview|GET|$API/analytics/overview" \
  "List Dashboards|GET|$API/analytics/dashboards" \
  "List Reports|GET|$API/analytics/reports" \
  "KPI Metrics|GET|$API/analytics/kpis?metric=members&period=30d"; do
  IFS='|' read -r name method url <<< "$ep"
  C=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && echo "✅ $name" && ((PASS++)) || echo "❌ $name (HTTP $C)" && ((FAIL++))
done
echo ""
echo "Analytics Tests: $PASS passed, $FAIL failed"
```
