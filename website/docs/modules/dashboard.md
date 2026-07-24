---
sidebar_position: 5
title: Dashboard
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Dashboard Module

The Dashboard is your command center — an at-a-glance overview of your entire association.

## What You See

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

When you log in, you land here. The Dashboard shows you:

- **KPI Cards (top row):** Big numbers — how many active members, total revenue, upcoming events, pending items
- **Revenue Chart:** A line chart showing money coming in over the last 12 months
- **Recent Activity:** A feed of what just happened — new members, payments received, event signups
- **Sidebar:** Links to all other modules

**Nothing to configure** — it updates automatically as data changes in other modules.

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (7)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/analytics/overview` | KPI summary |
| `GET` | `/analytics/dashboards` | Dashboard widget data |
| `GET` | `/analytics/dashboards/{id}` | Specific dashboard |
| `POST` | `/analytics/dashboards` | Create dashboard |
| `PUT` | `/analytics/dashboards/{id}` | Update dashboard |
| `DELETE` | `/analytics/dashboards/{id}` | Delete dashboard |
| `GET` | `/analytics/dashboards/{id}/widgets` | Widget layout |

```bash
# Get dashboard overview
curl -s https://ams.14.jugaar.ai/api/v1/analytics/overview \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected response (200):**
```json
{
  "members": {"total": 78, "active": 57, "inactive": 14, "pending": 7},
  "finances": {"total_revenue": 6255.00, "pending_invoices": 3},
  "events": {"upcoming": 8, "total": 17}
}
```

</TabItem>
</Tabs>

## KPI Cards Explained

| Card | What It Shows | Data Source |
|---|---|---|
| Active Members | Number of members with `active` status | Members module |
| Total Revenue | Sum of all paid invoices | Finances module |
| Upcoming Events | Events in the future | Events module |
| Pending Items | Invoices awaiting payment + events needing attention | Multiple modules |

---

## Related

- [Testing: Dashboard](../testing/overview)
- [Analytics Module](./analytics)
