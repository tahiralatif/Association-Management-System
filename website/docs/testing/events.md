---
sidebar_position: 20
title: Events
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Events

Test event creation, registration, check-in, and feedback.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: List Events

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Log in as admin
2. Click **Events** in the sidebar
3. ✅ See 17 seeded events (conferences, galas, workshops, hackathons)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/events/ \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Event Statistics

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Look for stats in the Events module
2. ✅ See upcoming events, total attendance, revenue from tickets

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/events/stats \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Event Details

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click on any event
2. ✅ See title, date, location, capacity, attendees, sessions

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Get event ID from list, then:
curl -s https://ams.14.jugaar.ai/api/v1/events/{event_id} \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 4: Create Event

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click "Create Event" button
2. Fill in title, date, location, capacity
3. ✅ Event appears in the list

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/events/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Workshop",
    "description": "A test event",
    "event_date": "2026-08-15T10:00:00",
    "location": "Online",
    "capacity": 50,
    "event_status": "upcoming"
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Events](../modules/events)
- [Testing: Communications](./communications)
