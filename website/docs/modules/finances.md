---
sidebar_position: 7
title: Finances
---

# Finances Module

Complete financial management — invoices, expenses, budgets, dues, and Stripe payments.

## Features

- **Invoices:** Auto-numbered, line items, tax calculations, PDF generation
- **Expenses:** Submit, approve/reject workflow, categorization
- **Budgets:** Set departmental budgets, track spending vs budget
- **Dues Structures:** Annual, monthly, tiered membership dues
- **Payments:** Stripe checkout integration, payment recording
- **Recurring Transactions:** Auto-generate monthly invoices
- **Financial Reports:** Revenue by category, outstanding balances, P&L

## API Endpoints (20 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/finances/finances/invoices` | List invoices | Staff+ |
| `POST` | `/finances/finances/invoices` | Create invoice | Staff+ |
| `GET` | `/finances/finances/invoices/stats` | Invoice statistics | Staff+ |
| `GET` | `/finances/finances/invoices/{id}` | Get invoice details | Staff+ |
| `PUT` | `/finances/finances/invoices/{id}` | Update invoice | Staff+ |
| `DELETE` | `/finances/finances/invoices/{id}` | Void invoice | Admin |
| `POST` | `/finances/finances/invoices/{id}/pay` | Record payment | Staff+ |
| `GET` | `/finances/finances/expenses` | List expenses | Staff+ |
| `POST` | `/finances/finances/expenses` | Submit expense | Staff+ |
| `PUT` | `/finances/finances/expenses/{id}/approve` | Approve expense | Admin |
| `PUT` | `/finances/finances/expenses/{id}/reject` | Reject expense | Admin |
| `GET` | `/finances/finances/dues` | List dues structures | Staff+ |
| `POST` | `/finances/finances/dues` | Create dues structure | Admin |
| `GET` | `/finances/finances/budgets` | List budgets | Staff+ |
| `POST` | `/finances/finances/budgets` | Create budget | Admin |
| `GET` | `/finances/finances/reports` | Financial reports | Staff+ |
| `GET` | `/finances/finances/reports/summary` | Revenue summary | Staff+ |
| `POST` | `/finances/finances/payments/create-checkout` | Stripe checkout | Member |
| `POST` | `/finances/finances/payments/webhook` | Stripe webhook | System |
| `GET` | `/finances/finances/payments/history` | Payment history | Member |

## Invoice Lifecycle

```
Draft → Sent → Partially Paid → Paid → Closed
  ↓                  ↓
Voided            Overdue
```

## Expense Approval Flow

```
Submitted → Under Review → Approved → Rejected
     ↓            ↓            ↓
   Pending    In Progress   Paid
```

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List invoices
curl -s "$API/finances/finances/invoices" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get invoice stats
curl -s "$API/finances/finances/invoices/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List budgets
curl -s "$API/finances/finances/budgets" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Finances](../testing/finances.md) for complete test scripts.
