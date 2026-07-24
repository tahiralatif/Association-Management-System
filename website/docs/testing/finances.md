---
sidebar_position: 19
title: Finances
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Finances

Test invoices, expenses, budgets, and payment tracking.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Financial Dashboard

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Log in as admin
2. Click **Finances** in the sidebar
3. ✅ See total revenue, pending invoices, expenses, budget status

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/dashboard \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected: 200 OK** with revenue, expense, and budget summaries.

</TabItem>
</Tabs>

## Test 2: Invoices

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. In Finances, browse the invoices list
2. ✅ See 13 seeded invoices with different amounts and statuses
3. Click an invoice to see details

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# List invoices
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/invoices \
  -H "Authorization: Bearer $TOKEN"

# Invoice stats
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/invoices/stats \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Expenses

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Browse the expenses section
2. ✅ See 31 seeded expenses (venue, catering, marketing, tech, travel)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/expenses \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 4: Budgets

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check the budgets section
2. ✅ See 17 budgets with progress bars (spent vs. allocated)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/budgets \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Expected Results

| Test | Easy | API |
|---|---|---|
| Dashboard | Revenue/expense cards | 200 + financial summary |
| Invoices | Invoice list with statuses | 200 + items array |
| Expenses | Expense list with categories | 200 + items array |
| Budgets | Budget progress bars | 200 + items array |

---

## Related

- [Modules: Finances](../modules/finances)
- [Integrations: Stripe](../modules/integrations)
