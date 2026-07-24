---
sidebar_position: 16
title: Testing Overview
---

# Complete Testing Guide

This guide covers how to systematically test every feature of AssocHub.

## Testing Methodology

AssocHub can be tested three ways:

1. **API Testing (curl)** — Direct API endpoint testing
2. **Browser Testing (Camoufox)** — Full UI flow testing
3. **Manual Testing** — Step-by-step user acceptance testing

## Prerequisites

```bash
# Get an auth token first
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}'

# Save the token
export TOKEN="eyJ..."
```

## Module Test Summary

| # | Module | Endpoints | Tests | Status |
|---|---|---|---|---|
| 1 | Auth | 7 | Register, Login, Logout, Password | ✅ All Pass |
| 2 | Members | 26 | CRUD, Groups, Tags, Bulk, Import/Export | ✅ All Pass |
| 3 | Finances | 20 | Invoices, Expenses, Budgets, Dues | ✅ All Pass |
| 4 | Events | 15 | CRUD, Tickets, Check-in, Sessions, Feedback | ✅ All Pass |
| 5 | Communications | 16 | Campaigns, Announcements, Surveys, Templates | ✅ All Pass |
| 6 | Elections | 15 | Nominations, Voting, Results | ✅ All Pass |
| 7 | Documents | 13 | Upload, Categories, Versioning, Sharing | ✅ All Pass |
| 8 | Workflows | 11 | Create, Activate, Trigger, Runs | ✅ All Pass |
| 9 | AI Engine | 11 | Chat, Insights, Churn, Anomalies | ✅ All Pass |
| 10 | Analytics | 12 | Overview, Dashboards, Reports, Export | ✅ All Pass |
| 11 | Integrations | 12 | Webhooks, Stripe, Dashboard | ✅ All Pass |
| 12 | Health | 3 | Status, Services, Readiness | ✅ All Pass |
| | **Total** | **161** | | **161/161 ✅** |

## Quick Smoke Test

Run this to verify all modules are responding:

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

PASS=0; FAIL=0; TOTAL=0

test_endpoint() {
  local name=$1 method=$2 endpoint=$3
  ((TOTAL++))
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  if [ "$CODE" = "200" ]; then
    echo "✅ $name (HTTP $CODE)"
    ((PASS++))
  else
    echo "❌ $name (HTTP $CODE)"
    ((FAIL++))
  fi
}

echo "══════════════════════════════════════"
echo "  ASSOCHUB SMOKE TEST"
echo "══════════════════════════════════════"
echo ""

test_endpoint "Auth Me"         GET  "$API/auth/me"
test_endpoint "Members List"    GET  "$API/members/"
test_endpoint "Members Stats"   GET  "$API/members/stats"
test_endpoint "Members Groups"  GET  "$API/members/groups"
test_endpoint "Members Tags"    GET  "$API/members/tags"
test_endpoint "Events List"     GET  "$API/events/"
test_endpoint "Events Stats"    GET  "$API/events/stats"
test_endpoint "Invoices List"   GET  "$API/finances/finances/invoices"
test_endpoint "Invoice Stats"   GET  "$API/finances/finances/invoices/stats"
test_endpoint "Budgets"         GET  "$API/finances/finances/budgets"
test_endpoint "Expenses"        GET  "$API/finances/finances/expenses"
test_endpoint "Campaigns"       GET  "$API/communications/campaigns"
test_endpoint "Announcements"   GET  "$API/communications/announcements"
test_endpoint "Surveys"         GET  "$API/communications/surveys"
test_endpoint "Templates"       GET  "$API/communications/templates"
test_endpoint "Elections"       GET  "$API/elections/"
test_endpoint "Election Stats"  GET  "$API/elections/stats"
test_endpoint "Documents"       GET  "$API/documents/"
test_endpoint "Doc Stats"       GET  "$API/documents/stats"
test_endpoint "Categories"      GET  "$API/documents/categories"
test_endpoint "Workflows"       GET  "$API/workflows/"
test_endpoint "WF Templates"    GET  "$API/workflows/templates"
test_endpoint "WF Stats"        GET  "$API/workflows/stats"
test_endpoint "AI Models"       GET  "$API/ai/models"
test_endpoint "AI Insights"     GET  "$API/ai/insights"
test_endpoint "Analytics"       GET  "$API/analytics/overview"
test_endpoint "Dashboards"      GET  "$API/analytics/dashboards"
test_endpoint "Reports"         GET  "$API/analytics/reports"
test_endpoint "Integrations"    GET  "$API/integrations/"
test_endpoint "Webhooks"        GET  "$API/integrations/webhooks"
test_endpoint "Integration DB"  GET  "$API/integrations/dashboard"
test_endpoint "Health"          GET  "http://localhost:8002/health"

echo ""
echo "══════════════════════════════════════"
echo "  RESULTS: $PASS/$TOTAL passed, $FAIL failed"
echo "══════════════════════════════════════"
```

## Browser Testing with Camoufox

```python
from camoufox.sync_api import Camoufox

with Camoufox(headless=True) as browser:
    page = browser.new_page()
    
    # Test landing page
    page.goto("https://ams.14.jugaar.ai")
    assert "AssocHub" in page.title()
    
    # Test registration
    page.goto("https://ams.14.jugaar.ai/register")
    page.fill('input[type="email"]', "test@example.com")
    page.fill('input[name="first_name"]', "Test")
    page.fill('input[name="last_name"]', "User")
    page.fill('input[type="password"]', "***")
    # ... etc
```

## Testing Order

Follow this sequence for comprehensive coverage:

1. [Auth Flow](./auth-flow) — Register, login, logout, redirects
2. [Members](./members) — CRUD, groups, tags, bulk ops
3. [Finances](./finances) — Invoices, expenses, budgets
4. [Events](./events) — Create, register, check-in
5. [Communications](./communications) — Campaigns, announcements
6. [Elections](./elections) — Nominations, voting, results
7. [Documents](./documents) — Upload, share, version
8. [Workflows](./workflows) — Create, activate, trigger
9. [AI Engine](./ai-engine) — Chat, insights, predictions
10. [Analytics](./analytics) — Dashboards, reports, export
11. [Integrations](./integrations) — Webhooks, Stripe
12. [API](./api) — Pagination, filtering, errors
