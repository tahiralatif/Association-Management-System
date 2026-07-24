---
sidebar_position: 6
title: Members
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Members Module

Full member lifecycle management — from registration to retention.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Add people** — Create new member profiles with name, email, phone, membership type, and status.

**Organize** — Put members into groups (committees, boards, interest groups) and tag them (VIP, speaker, volunteer).

**Bulk actions** — Select multiple members and add/remove tags or change status all at once.

**Import/Export** — Bring in members from a CSV file or export your list.

**Self-service** — Members can update their own profiles.

**AI-powered** — The system predicts which members might leave (churn prediction).

### Try it now:

1. Click **Members** in the sidebar
2. You'll see a list of all 78 members
3. Click on any member to see their full profile
4. Try searching by name using the search bar

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (26)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/members/` | List all members (paginated) | Staff+ |
| `GET` | `/members/me` | Current user's profile | Member |
| `GET` | `/members/stats` | Member statistics | Staff+ |
| `GET` | `/members/{id}` | Get member by ID | Staff+ |
| `POST` | `/members/` | Create new member | Staff+ |
| `PUT` | `/members/{id}` | Update member | Staff+ |
| `DELETE` | `/members/{id}` | Delete member | Admin |
| `GET` | `/members/groups` | List groups | Member |
| `POST` | `/members/groups` | Create group | Staff+ |
| `POST` | `/members/groups/{id}/members` | Add to group | Staff+ |
| `DELETE` | `/members/groups/{id}/members/{mid}` | Remove from group | Staff+ |
| `GET` | `/members/tags` | List tags | Member |
| `POST` | `/members/tags` | Create tag | Staff+ |
| `POST` | `/members/{id}/tags` | Add tag to member | Staff+ |
| `DELETE` | `/members/{id}/tags/{tag}` | Remove tag | Staff+ |
| `POST` | `/members/bulk/add-tags` | Bulk add tags | Staff+ |
| `POST` | `/members/bulk/remove-tags` | Bulk remove tags | Staff+ |
| `POST` | `/members/bulk/change-status` | Bulk status change | Staff+ |
| `POST` | `/members/import` | Import from CSV | Admin |
| `GET` | `/members/export` | Export (CSV/JSON) | Staff+ |
| `GET` | `/members/{id}/activity` | Activity log | Staff+ |
| `POST` | `/members/{id}/notes` | Add staff note | Staff+ |
| `GET` | `/members/{id}/notes` | List staff notes | Staff+ |
| `PUT` | `/members/{id}/notes/{nid}` | Update note | Staff+ |
| `DELETE` | `/members/{id}/notes/{nid}` | Delete note | Staff+ |
| `GET` | `/members/search` | Search members | Member |

### Data Model

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
  "groups": ["executive-committee"]
}
```

### Example: List Members

```bash
curl -s https://ams.14.jugaar.ai/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Example: Create a Member

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "membership_type": "basic",
    "status": "active"
  }'
```

### Example: Search Members

```bash
curl -s "https://ams.14.jugaar.ai/api/v1/members/search?q=daniel" \
  -H "Authorization: Bearer $TOKEN"
```

### Membership Types

| Type | Description |
|---|---|
| `basic` | Standard membership |
| `premium` | Enhanced benefits |
| `lifetime` | One-time payment |
| `student` | Discounted rate |
| `honorary` | No fee |

### Member Statuses

| Status | Meaning |
|---|---|
| `active` | Current, paying member |
| `inactive` | Not currently active |
| `suspended` | Temporarily suspended |
| `pending` | Awaiting approval |

</TabItem>
</Tabs>

---

## Related

- [Testing: Members](../testing/members)
- [AI: Churn Prediction](./ai-engine)
- [Communications: Email Campaigns](./communications)
