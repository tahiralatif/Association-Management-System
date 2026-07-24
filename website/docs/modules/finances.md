---
sidebar_position: 7
title: Finances
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Finances Module

Manage money — invoices, payments, expenses, and budgets.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Invoices** — Create invoices, send them to members, track who's paid and who hasn't.

**Expenses** — Log what your association spends money on (venue, catering, marketing, etc.).

**Budgets** — Set spending limits per department or project and track how much you've used.

**Dues** — Define membership fee schedules (annual, monthly, etc.).

**Stripe** — Accept online payments via Stripe.

### Try it now:

1. Click **Finances** in the sidebar
2. See the financial overview — total revenue, pending invoices, expenses
3. Browse the invoices list
4. Check the budgets section

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (20)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/finances/finances/dashboard` | Financial overview | Staff+ |
| `GET` | `/finances/finances/invoices` | List invoices | Staff+ |
| `POST` | `/finances/finances/invoices` | Create invoice | Staff+ |
| `GET` | `/finances/finances/invoices/stats` | Invoice statistics | Staff+ |
| `GET` | `/finances/finances/invoices/{id}` | Get invoice | Staff+ |
| `PUT` | `/finances/finances/invoices/{id}` | Update invoice | Staff+ |
| `POST` | `/finances/finances/invoices/{id}/payments` | Record payment | Staff+ |
| `GET` | `/finances/finances/expenses` | List expenses | Staff+ |
| `POST` | `/finances/finances/expenses` | Create expense | Staff+ |
| `PUT` | `/finances/finances/expenses/{id}` | Update expense | Staff+ |
| `GET` | `/finances/finances/budgets` | List budgets | Staff+ |
| `POST` | `/finances/finances/budgets` | Create budget | Staff+ |
| `PUT` | `/finances/finances/budgets/{id}` | Update budget | Staff+ |
| `GET` | `/finances/finances/dues-schedules` | List dues schedules | Staff+ |
| `POST` | `/finances/finances/dues-schedules` | Create dues schedule | Staff+ |
| `GET` | `/finances/finances/dues-schedules/{id}` | Get schedule | Staff+ |
| `PUT` | `/finances/finances/dues-schedules/{id}` | Update schedule | Staff+ |
| `POST` | `/finances/finances/dues-schedules/{id}/generate` | Generate invoices | Staff+ |
| `GET` | `/finances/finances/expenses/stats` | Expense statistics | Staff+ |
| `GET` | `/finances/finances/budgets/stats` | Budget statistics | Staff+ |

:::warning
Note the double `/finances/finances/` in the URL — this is the actual route structure.
:::

### Example: List Invoices

```bash
curl -s https://ams.14.jugaar.ai/api/v1/finances/finances/invoices \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Example: Create an Invoice

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/finances/finances/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "uuid-of-member",
    "amount": 250.00,
    "description": "Annual membership fee",
    "due_date": "2026-08-15"
  }'
```

### Example: Record a Payment

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/finances/finances/invoices/{invoice_id}/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250.00,
    "payment_method": "stripe"
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Finances](../testing/finances)
- [Integrations: Stripe](./integrations)
- [Analytics](./analytics)
