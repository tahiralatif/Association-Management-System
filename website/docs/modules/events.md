---
sidebar_position: 8
title: Events
---

# Events Module

End-to-end event management — from planning to post-event analytics.

## Features

- **Event CRUD:** Create, edit, publish, cancel events
- **Ticket Types:** Early bird, regular, VIP, student, group discounts
- **Registration:** Member registration, guest registration, waitlists
- **Check-In:** QR code scanning, manual check-in, batch check-in
- **Sessions:** Multi-track scheduling, room assignments
- **Speakers:** Speaker profiles, session assignments
- **Sponsors:** Sponsor tiers, logo display, contact info
- **Feedback:** Post-event surveys, star ratings, comments
- **Capacity Management:** Max attendees, waitlist overflow

## API Endpoints (15 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/events/` | List events (paginated) | Member |
| `POST` | `/events/` | Create event | Staff+ |
| `GET` | `/events/stats` | Event statistics | Staff+ |
| `GET` | `/events/{id}` | Get event details | Member |
| `PUT` | `/events/{id}` | Update event | Staff+ |
| `DELETE` | `/events/{id}` | Cancel event | Admin |
| `POST` | `/events/{id}/publish` | Publish event | Staff+ |
| `GET` | `/events/{id}/tickets` | List ticket types | Member |
| `POST` | `/events/{id}/tickets` | Create ticket type | Staff+ |
| `POST` | `/events/{id}/register` | Register for event | Member |
| `POST` | `/events/{id}/check-in` | Check in attendee | Staff+ |
| `GET` | `/events/{id}/sessions` | List sessions | Member |
| `POST` | `/events/{id}/sessions` | Create session | Staff+ |
| `GET` | `/events/{id}/speakers` | List speakers | Member |
| `POST` | `/events/{id}/feedback` | Submit feedback | Member |

## Event Statuses

| Status | Meaning |
|---|---|
| `draft` | Being planned, not visible to members |
| `published` | Open for registration |
| `sold_out` | At capacity, waitlist active |
| `cancelled` | Event cancelled |
| `completed` | Event finished |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List events
curl -s "$API/events/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get event stats
curl -s "$API/events/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Events](../testing/events.md) for complete test scripts.
