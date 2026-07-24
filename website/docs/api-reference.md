---
sidebar_position: 32
title: API Reference
---

# API Reference

## Overview

AssocHub exposes **161 REST API endpoints** across 12 modules.

- **Base URL:** `http://localhost:8002/api/v1` (local) or `https://ams.14.jugaar.ai/api/v1` (live)
- **Authentication:** JWT Bearer token in `Authorization` header
- **Content-Type:** `application/json` (except file uploads which use `multipart/form-data`)
- **Interactive Docs:** `http://localhost:8002/docs` (Swagger UI)

## Quick Reference

### Auth (7 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login, get JWT token |
| `GET` | `/auth/me` | Get current user profile |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Invalidate token |
| `POST` | `/auth/change-password` | Change password |
| `POST` | `/auth/forgot-password` | Request password reset |

### Members (26 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/members/` | List members (paginated) |
| `POST` | `/members/` | Create member |
| `GET` | `/members/me` | Current user profile |
| `GET` | `/members/stats` | Member statistics |
| `GET` | `/members/search` | Search members |
| `GET` | `/members/export` | Export CSV/JSON |
| `POST` | `/members/import` | Import from CSV |
| `GET` | `/members/{id}` | Get member by ID |
| `PUT` | `/members/{id}` | Update member |
| `DELETE` | `/members/{id}` | Delete member |
| `GET` | `/members/groups` | List groups |
| `POST` | `/members/groups` | Create group |
| `POST` | `/members/groups/{id}/members` | Add to group |
| `DELETE` | `/members/groups/{id}/members/{mid}` | Remove from group |
| `GET` | `/members/tags` | List tags |
| `POST` | `/members/tags` | Create tag |
| `POST` | `/members/{id}/tags` | Add tag |
| `DELETE` | `/members/{id}/tags/{tag}` | Remove tag |
| `POST` | `/members/bulk/add-tags` | Bulk add tags |
| `POST` | `/members/bulk/remove-tags` | Bulk remove tags |
| `POST` | `/members/bulk/change-status` | Bulk status change |
| `GET` | `/members/{id}/activity` | Activity log |
| `POST` | `/members/{id}/notes` | Add staff note |
| `GET` | `/members/{id}/notes` | List notes |
| `PUT` | `/members/{id}/notes/{nid}` | Update note |
| `DELETE` | `/members/{id}/notes/{nid}` | Delete note |

### Finances (20 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/finances/finances/invoices` | List invoices |
| `POST` | `/finances/finances/invoices` | Create invoice |
| `GET` | `/finances/finances/invoices/stats` | Invoice stats |
| `GET` | `/finances/finances/invoices/{id}` | Get invoice |
| `PUT` | `/finances/finances/invoices/{id}` | Update invoice |
| `DELETE` | `/finances/finances/invoices/{id}` | Void invoice |
| `POST` | `/finances/finances/invoices/{id}/pay` | Record payment |
| `GET` | `/finances/finances/expenses` | List expenses |
| `POST` | `/finances/finances/expenses` | Submit expense |
| `PUT` | `/finances/finances/expenses/{id}/approve` | Approve |
| `PUT` | `/finances/finances/expenses/{id}/reject` | Reject |
| `GET` | `/finances/finances/dues` | List dues structures |
| `POST` | `/finances/finances/dues` | Create dues |
| `GET` | `/finances/finances/budgets` | List budgets |
| `POST` | `/finances/finances/budgets` | Create budget |
| `GET` | `/finances/finances/reports` | Financial reports |
| `GET` | `/finances/finances/reports/summary` | Revenue summary |
| `POST` | `/finances/finances/payments/create-checkout` | Stripe checkout |
| `POST` | `/finances/finances/payments/webhook` | Stripe webhook |
| `GET` | `/finances/finances/payments/history` | Payment history |

### Events (15 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/events/` | List events |
| `POST` | `/events/` | Create event |
| `GET` | `/events/stats` | Event stats |
| `GET` | `/events/{id}` | Get event |
| `PUT` | `/events/{id}` | Update event |
| `DELETE` | `/events/{id}` | Cancel event |
| `POST` | `/events/{id}/publish` | Publish event |
| `GET` | `/events/{id}/tickets` | List tickets |
| `POST` | `/events/{id}/tickets` | Create ticket |
| `POST` | `/events/{id}/register` | Register for event |
| `POST` | `/events/{id}/check-in` | Check in attendee |
| `GET` | `/events/{id}/sessions` | List sessions |
| `POST` | `/events/{id}/sessions` | Create session |
| `GET` | `/events/{id}/speakers` | List speakers |
| `POST` | `/events/{id}/feedback` | Submit feedback |

### Communications (16 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/communications/campaigns` | List campaigns |
| `POST` | `/communications/campaigns` | Create campaign |
| `GET` | `/communications/campaigns/{id}` | Get campaign |
| `PUT` | `/communications/campaigns/{id}` | Update campaign |
| `POST` | `/communications/campaigns/{id}/send` | Send campaign |
| `POST` | `/communications/campaigns/{id}/duplicate` | Duplicate |
| `GET` | `/communications/announcements` | List announcements |
| `POST` | `/communications/announcements` | Create announcement |
| `GET` | `/communications/surveys` | List surveys |
| `POST` | `/communications/surveys` | Create survey |
| `POST` | `/communications/surveys/{id}/respond` | Submit response |
| `GET` | `/communications/templates` | List templates |
| `POST` | `/communications/templates` | Create template |
| `GET` | `/communications/notifications` | List notifications |
| `POST` | `/communications/notifications/mark-read` | Mark as read |
| `GET` | `/communications/send-logs` | Send history |

### Elections (15 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/elections/` | List elections |
| `POST` | `/elections/` | Create election |
| `GET` | `/elections/stats` | Election stats |
| `GET` | `/elections/{id}` | Get election |
| `PUT` | `/elections/{id}` | Update election |
| `DELETE` | `/elections/{id}` | Delete election |
| `POST` | `/elections/{id}/start-nominations` | Open nominations |
| `POST` | `/elections/{id}/close-nominations` | Close nominations |
| `GET` | `/elections/{id}/positions` | List positions |
| `POST` | `/elections/{id}/positions` | Create position |
| `POST` | `/elections/{id}/nominate` | Submit nomination |
| `PUT` | `/elections/{id}/nominations/{nid}/accept` | Accept |
| `PUT` | `/elections/{id}/nominations/{nid}/decline` | Decline |
| `POST` | `/elections/{id}/vote` | Cast vote |
| `POST` | `/elections/{id}/close` | Close election |

### Documents (13 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/documents/` | List documents |
| `POST` | `/documents/` | Upload document |
| `GET` | `/documents/stats` | Document stats |
| `GET` | `/documents/{id}` | Get document |
| `PUT` | `/documents/{id}` | Update metadata |
| `DELETE` | `/documents/{id}` | Delete document |
| `GET` | `/documents/{id}/versions` | List versions |
| `POST` | `/documents/{id}/versions` | Upload new version |
| `GET` | `/documents/categories` | List categories |
| `POST` | `/documents/categories` | Create category |
| `POST` | `/documents/{id}/share` | Share document |
| `POST` | `/documents/{id}/comments` | Add comment |
| `GET` | `/documents/{id}/comments` | List comments |

### Workflows (11 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/workflows/` | List workflows |
| `POST` | `/workflows/` | Create workflow |
| `GET` | `/workflows/stats` | Workflow stats |
| `GET` | `/workflows/{id}` | Get workflow |
| `PUT` | `/workflows/{id}` | Update workflow |
| `DELETE` | `/workflows/{id}` | Delete workflow |
| `POST` | `/workflows/{id}/activate` | Activate |
| `POST` | `/workflows/{id}/deactivate` | Pause |
| `POST` | `/workflows/{id}/trigger` | Manually trigger |
| `GET` | `/workflows/{id}/runs` | View run history |
| `GET` | `/workflows/templates` | List templates |

### AI Engine (11 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ai/models` | List models |
| `POST` | `/ai/chat` | Chat with AI |
| `POST` | `/ai/insights` | Generate insights |
| `GET` | `/ai/insights` | Get cached insights |
| `POST` | `/ai/predict/churn` | Predict churn |
| `POST` | `/ai/detect/anomalies` | Detect anomalies |
| `POST` | `/ai/embeddings` | Create embeddings |
| `POST` | `/ai/search/semantic` | Semantic search |
| `POST` | `/ai/generate/document` | Generate document |
| `POST` | `/ai/generate/email` | Generate email |
| `GET` | `/ai/usage` | Usage stats |

### Analytics (12 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/overview` | Dashboard overview |
| `GET` | `/analytics/dashboards` | List dashboards |
| `POST` | `/analytics/dashboards` | Create dashboard |
| `GET` | `/analytics/dashboards/{id}` | Get dashboard |
| `PUT` | `/analytics/dashboards/{id}` | Update dashboard |
| `DELETE` | `/analytics/dashboards/{id}` | Delete dashboard |
| `POST` | `/analytics/dashboards/{id}/widgets` | Add widget |
| `GET` | `/analytics/reports` | List reports |
| `POST` | `/analytics/reports` | Create report |
| `GET` | `/analytics/reports/{id}` | Get report |
| `GET` | `/analytics/reports/{id}/export` | Export report |
| `GET` | `/analytics/kpis` | KPI time-series |

### Integrations (12 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/integrations/` | List integrations |
| `POST` | `/integrations/` | Create integration |
| `GET` | `/integrations/{id}` | Get integration |
| `PUT` | `/integrations/{id}` | Update integration |
| `DELETE` | `/integrations/{id}` | Delete integration |
| `POST` | `/integrations/{id}/test` | Test integration |
| `GET` | `/integrations/webhooks` | List webhooks |
| `POST` | `/integrations/webhooks` | Create webhook |
| `PUT` | `/integrations/webhooks/{id}` | Update webhook |
| `DELETE` | `/integrations/webhooks/{id}` | Delete webhook |
| `POST` | `/integrations/webhooks/{id}/test` | Test webhook |
| `GET` | `/integrations/dashboard` | Dashboard |

### Health (3 endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | System health check |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/health/live` | Liveness probe |
