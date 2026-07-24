---
sidebar_position: 9
title: Communications
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Communications Module

Reach your members — email campaigns, announcements, surveys, and templates.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Email Campaigns** — Write an email, pick who gets it, send it. Track opens and clicks.

**Announcements** — Post news to a bulletin board. Pin important ones to the top.

**Surveys** — Create surveys with multiple-choice or open-ended questions. See results.

**Templates** — Save reusable email templates so you don't start from scratch every time.

### Try it now:

1. Click **Communications** in the sidebar
2. Browse the 26 announcements (some pinned)
3. Check the 4 surveys (NPS, event feedback, member satisfaction)
4. Look at the email campaigns

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (16)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/communications/campaigns` | List campaigns | Staff+ |
| `POST` | `/communications/campaigns` | Create campaign | Staff+ |
| `GET` | `/communications/campaigns/{id}` | Get campaign | Staff+ |
| `PUT` | `/communications/campaigns/{id}` | Update campaign | Staff+ |
| `POST` | `/communications/campaigns/{id}/send` | Send campaign | Staff+ |
| `GET` | `/communications/announcements` | List announcements | Staff+ |
| `POST` | `/communications/announcements` | Create announcement | Staff+ |
| `PUT` | `/communications/announcements/{id}` | Update announcement | Staff+ |
| `DELETE` | `/communications/announcements/{id}` | Delete announcement | Admin |
| `GET` | `/communications/surveys` | List surveys | Staff+ |
| `POST` | `/communications/surveys` | Create survey | Staff+ |
| `POST` | `/communications/surveys/{id}/respond` | Submit response | Member |
| `GET` | `/communications/surveys/{id}/results` | View results | Staff+ |
| `GET` | `/communications/templates` | List email templates | Staff+ |
| `POST` | `/communications/templates` | Create template | Staff+ |
| `PUT` | `/communications/templates/{id}` | Update template | Staff+ |

### Example: Send a Campaign

```bash
# Create a campaign
curl -X POST https://ams.14.jugaar.ai/api/v1/communications/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "July Newsletter",
    "subject": "Your July Update",
    "content": "<h1>Hello!</h1><p>Here is your monthly update...</p>",
    "target_audience": "all_active"
  }'

# Send it
curl -X POST https://ams.14.jugaar.ai/api/v1/communications/campaigns/{campaign_id}/send \
  -H "Authorization: Bearer $TOKEN"
```

### Example: Create an Announcement

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/communications/announcements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Gala - Save the Date!",
    "content": "Our annual gala is on October 15th. Mark your calendars!",
    "category": "events",
    "is_pinned": true
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Communications](../testing/communications)
- [Events](./events)
- [Members](./members)
