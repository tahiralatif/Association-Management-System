---
sidebar_position: 6
title: Members
---

# Members Module

Full member lifecycle management — from registration to retention analytics.

## Features

- **Member Profiles:** Name, email, phone, address, membership type, status
- **Groups:** Organize members into committees, boards, interest groups
- **Tags:** Flexible labeling (VIP, speaker, volunteer, etc.)
- **Bulk Operations:** Add/remove tags, change status, export in bulk
- **Import/Export:** CSV import with field mapping, CSV/JSON export
- **Activity Logs:** Track every member interaction
- **Staff Notes:** Internal notes visible only to staff/admins
- **Self-Service Portal:** Members can update their own profiles
- **Churn Prediction:** AI-powered at-risk member identification

## API Endpoints (26 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/members/` | List all members (paginated, filterable) | Staff+ |
| `GET` | `/members/me` | Get current user's profile | Member |
| `GET` | `/members/stats` | Member statistics | Staff+ |
| `GET` | `/members/{id}` | Get member by ID | Staff+ |
| `POST` | `/members/` | Create new member | Staff+ |
| `PUT` | `/members/{id}` | Update member | Staff+ |
| `DELETE` | `/members/{id}` | Delete member | Admin |
| `GET` | `/members/groups` | List member groups | Member |
| `POST` | `/members/groups` | Create group | Staff+ |
| `POST` | `/members/groups/{id}/members` | Add member to group | Staff+ |
| `DELETE` | `/members/groups/{id}/members/{mid}` | Remove from group | Staff+ |
| `GET` | `/members/tags` | List all tags | Member |
| `POST` | `/members/tags` | Create tag | Staff+ |
| `POST` | `/members/{id}/tags` | Add tag to member | Staff+ |
| `DELETE` | `/members/{id}/tags/{tag}` | Remove tag | Staff+ |
| `POST` | `/members/bulk/add-tags` | Bulk add tags | Staff+ |
| `POST` | `/members/bulk/remove-tags` | Bulk remove tags | Staff+ |
| `POST` | `/members/bulk/change-status` | Bulk status change | Staff+ |
| `POST` | `/members/import` | Import from CSV | Admin |
| `GET` | `/members/export` | Export members (CSV/JSON) | Staff+ |
| `GET` | `/members/{id}/activity` | Activity log | Staff+ |
| `POST` | `/members/{id}/notes` | Add staff note | Staff+ |
| `GET` | `/members/{id}/notes` | List staff notes | Staff+ |
| `PUT` | `/members/{id}/notes/{nid}` | Update note | Staff+ |
| `DELETE` | `/members/{id}/notes/{nid}` | Delete note | Staff+ |
| `GET` | `/members/search` | Search members | Member |

## Data Model

```json
{
  "id": "uuid",
  "first_name": "Daniel",
  "last_name": "Harris",
  "email": "daniel.harris@example.com",
  "phone": "+1-555-0101",
  "membership_type": "premium",
  "status": "active",
  "joined_date": "2025-01-15",
  "tags": ["board-member", "vip"],
  "groups": ["executive-committee"],
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2026-07-24T05:00:00Z"
}
```

## Membership Types

| Type | Description | Typical Use |
|---|---|---|
| `basic` | Standard membership | Regular members |
| `premium` | Enhanced benefits | Active contributors |
| `lifetime` | One-time payment | Long-term supporters |
| `student` | Discounted rate | Students |
| `honorary` | No fee | Distinguished members |

## Member Statuses

| Status | Meaning |
|---|---|
| `active` | Current, paying member |
| `inactive` | Not currently active |
| `suspended` | Temporarily suspended |
| `pending` | Awaiting approval |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List members
curl -s "$API/members/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get member stats
curl -s "$API/members/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Search members
curl -s "$API/members/search?q=daniel" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Members](../testing/members.md) for the complete test suite.
