---
sidebar_position: 10
title: Elections
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Elections Module

Run elections with ranked-choice voting, secret ballots, and real-time results.

## What Can You Do?

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

**Create elections** — Set up board elections, officer elections, or any vote.

**Nominations** — Let members nominate themselves or others for positions.

**Ranked-choice voting** — Voters rank candidates in order of preference. The winner is determined by instant-runoff.

**Secret ballots** — Votes are anonymous. Nobody can see who voted for whom.

**Real-time results** — Watch results update as votes come in. See round-by-round elimination.

### Try it now:

1. Click **Elections** in the sidebar
2. Browse 16 seeded elections — some active, some completed, some upcoming
3. Click on an election to see candidates and current results
4. Check the election statistics

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

### API Endpoints (15)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/elections/` | List elections | Staff+ |
| `POST` | `/elections/` | Create election | Staff+ |
| `GET` | `/elections/stats` | Election statistics | Staff+ |
| `GET` | `/elections/{id}` | Get election | Staff+ |
| `PUT` | `/elections/{id}` | Update election | Staff+ |
| `DELETE` | `/elections/{id}` | Delete election | Admin |
| `POST` | `/elections/{id}/nominate` | Nominate candidate | Member |
| `GET` | `/elections/{id}/candidates` | List candidates | Staff+ |
| `POST` | `/elections/{id}/vote` | Cast vote | Member |
| `GET` | `/elections/{id}/results` | Get results | Staff+ |
| `POST` | `/elections/{id}/publish` | Publish results | Admin |
| `GET` | `/elections/{id}/ballots` | List ballots | Admin |
| `GET` | `/elections/{id}/audit` | Audit trail | Admin |
| `PUT` | `/elections/{id}/candidates/{cid}` | Update candidate | Staff+ |
| `DELETE` | `/elections/{id}/candidates/{cid}` | Remove candidate | Staff+ |

### Example: Create an Election

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/elections/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Board President 2026",
    "description": "Annual board president election",
    "start_date": "2026-08-01T00:00:00",
    "end_date": "2026-08-15T23:59:59",
    "voting_method": "ranked_choice",
    "positions": ["President"]
  }'
```

### Example: Cast a Ranked-Choice Vote

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/elections/{election_id}/vote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rankings": [
      {"candidate_id": "uuid-1", "rank": 1},
      {"candidate_id": "uuid-2", "rank": 2},
      {"candidate_id": "uuid-3", "rank": 3}
    ]
  }'
```

</TabItem>
</Tabs>

---

## Related

- [Testing: Elections](../testing/elections)
- [Members](./members)
- [Communications: Election Announcements](./communications)
