---
sidebar_position: 10
title: Elections
---

# Elections Module

Full election lifecycle — nominations, ranked-choice voting, secret ballots, and real-time results.

## Features

- **Election Management:** Create elections with start/end dates
- **Positions:** Define open positions with descriptions and requirements
- **Nominations:** Self-nomination or nominate others, accept/decline workflow
- **Voting:** Ranked-choice voting, secret ballots
- **Quorum:** Configurable quorum requirements
- **Results:** Real-time tabulation, publish results
- **Voter Eligibility:** Automatic eligibility based on membership status

## API Endpoints (15 endpoints)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/elections/` | List elections | Member |
| `POST` | `/elections/` | Create election | Admin |
| `GET` | `/elections/stats` | Election statistics | Staff+ |
| `GET` | `/elections/{id}` | Get election details | Member |
| `PUT` | `/elections/{id}` | Update election | Admin |
| `DELETE` | `/elections/{id}` | Delete election | Admin |
| `POST` | `/elections/{id}/start-nominations` | Open nominations | Admin |
| `POST` | `/elections/{id}/close-nominations` | Close nominations | Admin |
| `GET` | `/elections/{id}/positions` | List positions | Member |
| `POST` | `/elections/{id}/positions` | Create position | Admin |
| `POST` | `/elections/{id}/nominate` | Submit nomination | Member |
| `PUT` | `/elections/{id}/nominations/{nid}/accept` | Accept nomination | Staff+ |
| `PUT` | `/elections/{id}/nominations/{nid}/decline` | Decline nomination | Staff+ |
| `POST` | `/elections/{id}/vote` | Cast vote | Member |
| `POST` | `/elections/{id}/close` | Close election | Admin |

## Election Lifecycle

```
Draft → Nominations Open → Nominations Closed → Voting Open → Voting Closed → Results Published
```

## Voting Methods

| Method | Description |
|---|---|
| **Ranked Choice** | Voters rank candidates in order of preference |
| **Simple Majority** | One vote per position, most votes wins |
| **Secret Ballot** | Votes are anonymized, no tracking of who voted for whom |

## Testing

```bash
TOKEN="your-jwt-token"
API="http://localhost:8002/api/v1"

# List elections
curl -s "$API/elections/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get election stats
curl -s "$API/elections/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

See [Testing: Elections](../testing/elections.md) for complete test scripts.
