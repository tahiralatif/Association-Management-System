---
sidebar_position: 5
title: Dashboard
---

# Dashboard Module

The Dashboard is your command center — an at-a-glance overview of your entire association.

## Features

- **KPI Cards:** Active members, total revenue, upcoming events, pending tasks
- **Revenue Chart:** Monthly revenue trend (last 12 months)
- **Recent Activity:** Latest member registrations, payments, event signups
- **Quick Actions:** Create member, send email, create event
- **Custom Widgets:** Drag-and-drop layout (coming soon)

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/kpis` | Key performance indicators |
| `GET` | `/dashboard/revenue` | Revenue chart data |
| `GET` | `/dashboard/activity` | Recent activity feed |
| `GET` | `/dashboard/widgets` | Custom widget layout |
| `POST` | `/dashboard/widgets` | Add custom widget |
| `PUT` | `/dashboard/widgets/{id}` | Update widget config |
| `DELETE` | `/dashboard/widgets/{id}` | Remove widget |

## How to Use

### View Your Dashboard

1. Log in to AssocHub
2. You'll land on the Dashboard automatically
3. KPI cards show real-time data from all modules

### KPI Card Breakdown

| Card | Source | Meaning |
|---|---|---|
| Active Members | Members module | Members with `active` status |
| Total Revenue | Finances module | Sum of paid invoices |
| Upcoming Events | Events module | Events within next 30 days |
| Pending Tasks | Workflows module | Tasks awaiting action |

## Testing

```bash
# Get dashboard KPIs
TOKEN="your-jwt-token"
curl -s http://localhost:8002/api/v1/dashboard/kpis \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** JSON with revenue, member count, event count, and activity data.
