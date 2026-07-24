---
sidebar_position: 16
title: Testing Overview
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing Guide

How to verify that every feature of AssocHub works correctly.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## Testing Methods

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

### Browser Testing (Recommended for Non-Developers)

1. Go to **[https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**
2. Log in with the admin credentials above
3. Click through each module in the sidebar
4. Verify you can see data (members, events, invoices, etc.)
5. Try creating, editing, and deleting items
6. Try the AI chat

**What to check in each module:**

| Module | Quick Check |
|---|---|
| Dashboard | See KPI numbers (members, revenue, events) |
| Members | Browse list, click a member, see profile |
| Finances | See invoices, check budgets |
| Events | See upcoming events, check attendees |
| Communications | Browse announcements, check campaigns |
| Elections | See elections, check results |
| Documents | Browse files, check categories |
| Workflows | See automation rules |
| AI Engine | Ask a question, get an answer |
| Analytics | See charts and stats |
| Integrations | Check webhook list |

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Smoke Test (Copy-Paste Ready)

**Step 1: Get a token**
```bash
TOKEN=$(curl -s -X POST https://ams.14.jugaar.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"Demo1234!","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
```

**Step 2: Run the smoke test**
```bash
API="https://ams.14.jugaar.ai/api/v1"
PASS=0; FAIL=0; TOTAL=0

test_endpoint() {
  local name=$1 method=$2 endpoint=$3
  ((TOTAL++))
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$endpoint" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
  if [ "$CODE" = "200" ]; then echo "✅ $name (HTTP $CODE)"; ((PASS++))
  else echo "❌ $name (HTTP $CODE)"; ((FAIL++)); fi
}

echo "═══ ASSOCHUB SMOKE TEST ═══"
test_endpoint "Auth Me"         GET  "$API/auth/me"
test_endpoint "Members List"    GET  "$API/members/"
test_endpoint "Members Stats"   GET  "$API/members/stats"
test_endpoint "Events List"     GET  "$API/events/"
test_endpoint "Events Stats"    GET  "$API/events/stats"
test_endpoint "Invoices"        GET  "$API/finances/finances/invoices"
test_endpoint "Invoice Stats"   GET  "$API/finances/finances/invoices/stats"
test_endpoint "Budgets"         GET  "$API/finances/finances/budgets"
test_endpoint "Expenses"        GET  "$API/finances/finances/expenses"
test_endpoint "Campaigns"       GET  "$API/communications/campaigns"
test_endpoint "Announcements"   GET  "$API/communications/announcements"
test_endpoint "Surveys"         GET  "$API/communications/surveys"
test_endpoint "Elections"       GET  "$API/elections/"
test_endpoint "Election Stats"  GET  "$API/elections/stats"
test_endpoint "Documents"       GET  "$API/documents/"
test_endpoint "Doc Stats"       GET  "$API/documents/stats"
test_endpoint "Workflows"       GET  "$API/workflows/"
test_endpoint "WF Stats"        GET  "$API/workflows/stats"
test_endpoint "AI Models"       GET  "$API/ai/models"
test_endpoint "AI Insights"     GET  "$API/ai/insights"
test_endpoint "AI Chat"         POST "$API/ai/chat"
test_endpoint "Analytics"       GET  "$API/analytics/overview"
test_endpoint "Dashboards"      GET  "$API/analytics/dashboards"
test_endpoint "Reports"         GET  "$API/analytics/reports"
test_endpoint "Integrations"    GET  "$API/integrations/"
test_endpoint "Webhooks"        GET  "$API/integrations/webhooks"
test_endpoint "Integration DB"  GET  "$API/integrations/dashboard"
test_endpoint "Health"          GET  "https://ams.14.jugaar.ai/health"

echo ""
echo "═══ RESULTS: $PASS/$TOTAL passed, $FAIL failed ═══"
```

### Module Test Summary

| # | Module | Endpoints | Status |
|---|---|---|---|
| 1 | Auth | 7 | ✅ |
| 2 | Members | 26 | ✅ |
| 3 | Finances | 20 | ✅ |
| 4 | Events | 15 | ✅ |
| 5 | Communications | 16 | ✅ |
| 6 | Elections | 15 | ✅ |
| 7 | Documents | 13 | ✅ |
| 8 | Workflows | 11 | ✅ |
| 9 | AI Engine | 11 | ✅ |
| 10 | Analytics | 12 | ✅ |
| 11 | Integrations | 12 | ✅ |
| 12 | Health | 3 | ✅ |
| | **Total** | **161** | **✅** |

</TabItem>
</Tabs>

---

## Testing Order

Start with authentication, then work through each module:

1. [Auth Flow](./auth-flow) — Register, login, logout, email verification
2. [Members](./members) — CRUD, groups, tags, bulk ops
3. [Finances](./finances) — Invoices, expenses, budgets
4. [Events](./events) — Create, register, check-in
5. [Communications](./communications) — Campaigns, announcements
6. [Elections](./elections) — Nominations, voting, results
7. [Documents](./documents) — Upload, share, version
8. [Workflows](./workflows) — Create, activate, trigger
9. [AI Engine](./ai-engine) — Chat, insights, predictions
10. [Analytics](./analytics) — Dashboards, reports
11. [Integrations](./integrations) — Webhooks, Stripe
12. [API](./api) — Pagination, filtering, errors

:::tip
Each testing page has its own Easy/Advanced toggle. Use Easy mode for browser walkthroughs, Advanced mode for curl commands and automation scripts.
:::
