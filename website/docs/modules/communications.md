---
sidebar_position: 9
title: Communications
---

# Communications Module

Email campaigns, announcements, surveys, and notification management.

## Features

- **Email Campaigns:** Create, schedule, A/B test, send bulk emails
- **Announcements:** Pin, schedule, category-based, priority levels
- **Surveys:** Multiple question types (text, rating, multiple choice, checkbox)
- **Email Templates:** Jinja2 templating with member data injection
- **Send Logs:** Track delivery status, opens, bounces
- **In-App Notifications:** Push notifications within the platform
- **Newsletter Builder:** Drag-and-drop newsletter creation

## API Endpoints (16 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/communications/campaigns` | List campaigns | Staff+ |
| `POST` | `/communications/campaigns` | Create campaign | Staff+ |
| `GET` | `/communications/campaigns/{id}` | Get campaign | Staff+ |
| `PUT` | `/communications/campaigns/{id}` | Update campaign | Staff+ |
| `POST` | `/communications/campaigns/{id}/send` | Send campaign | Staff+ |
| `POST` | `/communications/campaigns/{id}/duplicate` | Duplicate campaign | Staff+ |
| `GET` | `/communications/announcements` | List announcements | Member |
| `POST` | `/communications/announcements` | Create announcement | Staff+ |
| `GET` | `/communications/surveys` | List surveys | Staff+ |
| `POST` | `/communications/surveys` | Create survey | Staff+ |
| `POST` | `/communications/surveys/{id}/respond` | Submit response | Member |
| `GET` | `/communications/templates` | List email templates | Staff+ |
| `POST` | `/communications/templates` | Create template | Staff+ |
| `GET` | `/communications/notifications` | List notifications | Member |
| `POST` | `/communications/notifications/mark-read` | Mark as read | Member |
| `GET` | `/communications/send-logs` | Send history | Staff+ |

## Email Template Variables

```
{{ member.first_name }}    → John
{{ member.last_name }}     → Smith
{{ member.email }}         → john@example.com
{{ member.membership_type }} → premium
{{ event.name }}           → Annual Gala
{{ event.date }}           → 2026-03-15
```

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List campaigns
curl -s "$API/communications/campaigns" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# List announcements
curl -s "$API/communications/announcements" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Communications](../testing/communications.md) for complete test scripts.
