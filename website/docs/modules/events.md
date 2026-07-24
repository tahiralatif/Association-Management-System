---
sidebar_position: 8
title: Events
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Events Module

Create, manage, and track events — conferences, workshops, galas, and more.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Create events** — Set name, date, location, capacity, ticket price, and description.

**Sell tickets** — Different ticket types (early bird, VIP, general admission) with different prices.

**Check people in** — Mark attendees as arrived when they show up.

**Sessions & speakers** — Break events into sessions with individual speakers and schedules.

**Collect feedback** — After events, gather ratings and comments from attendees.

### Try it now:

1. Click **Events** in the sidebar
2. Browse 17 seeded events — tech conferences, galas, workshops, hackathons
3. Click on an event to see details, attendees, and sessions
4. Check the event stats page

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (15)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/events/` | List events | Staff+ |
| `POST` | `/events/` | Create event | Staff+ |
| `GET` | `/events/stats` | Event statistics | Staff+ |
| `GET` | `/events/{id}` | Get event | Staff+ |
| `PUT` | `/events/{id}` | Update event | Staff+ |
| `DELETE` | `/events/{id}` | Delete event | Admin |
| `POST` | `/events/{id}/register` | Register attendee | Member |
| `POST` | `/events/{id}/checkin/{member_id}` | Check in attendee | Staff+ |
| `GET` | `/events/{id}/attendees` | List attendees | Staff+ |
| `POST` | `/events/{id}/sessions` | Create session | Staff+ |
| `GET` | `/events/{id}/sessions` | List sessions | Staff+ |
| `PUT` | `/events/{id}/sessions/{sid}` | Update session | Staff+ |
| `POST` | `/events/{id}/feedback` | Submit feedback | Member |
| `GET` | `/events/{id}/feedback` | View feedback | Staff+ |
| `GET` | `/events/{id}/speakers` | List speakers | Staff+ |

### Example: Create an Event

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/events/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual Tech Conference 2026",
    "description": "Two-day technology conference",
    "event_date": "2026-09-15T09:00:00",
    "location": "Convention Center",
    "capacity": 500,
    "ticket_price": 150.00,
    "event_status": "upcoming"
  }'
```

### Example: Register for an Event

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/events/{event_id}/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "uuid-of-member", "ticket_type": "general"}'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Events](../testing/events)
- [Communications: Event Announcements](./communications)
- [AI: Anomaly Detection](./ai-engine)
