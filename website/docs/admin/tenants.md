---
sidebar_position: 30
title: Multi-Tenancy
---

# Multi-Tenancy

AssocHub supports multi-tenant deployments where multiple organizations share one installation.

## How It Works

- Each tenant has isolated data (members, events, finances, etc.)
- Users belong to one or more tenants
- `tenant_id` is included in JWT tokens
- All API queries are scoped to the current tenant

## Tenant ID

Every user record includes a `tenant_id`:

```json
{
  "email": "daniel.harris@example.com",
  "tenant_id": "demo-association",
  "roles": ["super_admin"]
}
```

## Tenant Switching

Super admins can switch between tenants:

```bash
curl -X POST http://localhost:8002/api/v1/auth/switch-tenant \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": "other-tenant"}'
```

## Default Tenants

| Tenant ID | Description |
|---|---|
| `default` | Default tenant for new registrations |
| `demo-association` | Demo tenant with sample data |

## Data Isolation

All queries are automatically filtered by `tenant_id`:

```
SELECT * FROM members WHERE tenant_id = $1
SELECT * FROM events WHERE tenant_id = $1
SELECT * FROM invoices WHERE tenant_id = $1
```

Super admins can access all tenants by including `X-Tenant-ID` header:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: other-tenant" \
  http://localhost:8002/api/v1/members/
```

## Creating New Tenants

```bash
curl -X POST http://localhost:8002/api/v1/admin/tenants \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "new-org",
    "name": "New Organization",
    "settings": {}
  }'
```
