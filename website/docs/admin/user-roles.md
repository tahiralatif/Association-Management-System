---
sidebar_position: 29
title: User Roles
---

# User Roles & Permissions

AssocHub uses role-based access control (RBAC) with four roles.

## Role Hierarchy

```
super_admin > tenant_admin > staff > member
```

## Role Definitions

### Member

The default role for all registered users.

| Can Do | Cannot Do |
|---|---|
| View own profile | List all members |
| Update own profile | Create/manage events |
| Register for events | Send campaigns |
| Submit documents | View financial stats |
| Vote in elections | Manage users |
| View announcements | Access analytics |
| Chat with AI | Manage integrations |

### Staff

Elevated access for operational users.

| Can Do | Cannot Do |
|---|---|
| Everything member can do | Delete members |
| List all members | Manage user roles |
| Create/manage events | Create budgets |
| Create/send campaigns | Delete elections |
| Upload documents | Access AI analytics |
| View statistics | Manage integrations |
| Add staff notes | |

### Tenant Admin

Full access within a single tenant.

| Can Do | Cannot Do |
|---|---|
| Everything staff can do | Access other tenants |
| Manage users & roles | System-wide configuration |
| Delete members | |
| Create budgets | |
| Manage elections | |
| Configure integrations | |
| Full analytics access | |

### Super Admin

Full system access across all tenants.

| Can Do |
|---|
| Everything above |
| Manage all tenants |
| System configuration |
| Database operations |
| Cross-tenant analytics |

## API Access by Role

| Endpoint | Member | Staff | Tenant Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|
| `GET /members/me` | ✅ | ✅ | ✅ | ✅ |
| `GET /members/` | ❌ | ✅ | ✅ | ✅ |
| `GET /members/stats` | ❌ | ✅ | ✅ | ✅ |
| `POST /members/` | ❌ | ✅ | ✅ | ✅ |
| `DELETE /members/{id}` | ❌ | ❌ | ✅ | ✅ |
| `GET /events/` | ✅ | ✅ | ✅ | ✅ |
| `POST /events/` | ❌ | ✅ | ✅ | ✅ |
| `GET /finances/*/stats` | ❌ | ✅ | ✅ | ✅ |
| `POST /ai/chat` | ✅ | ✅ | ✅ | ✅ |
| `GET /analytics/overview` | ❌ | ✅ | ✅ | ✅ |
| `POST /integrations/` | ❌ | ❌ | ✅ | ✅ |

## Changing User Roles

Only tenant admins and super admins can change roles:

```bash
curl -X PUT http://localhost:8002/api/v1/members/{member_id}/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "staff"}'
```

## Default Role on Registration

New users are assigned the `member` role by default. Admins must promote users manually.
