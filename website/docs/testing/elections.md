---
sidebar_position: 22
title: Elections
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Elections

Test election creation, nominations, voting, and results.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: List Elections

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Elections** in the sidebar
2. ✅ See 16 seeded elections (active, upcoming, completed)

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/elections/ \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 2: Election Statistics

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Check election stats
2. ✅ See total elections, voter turnout, completion rates

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/elections/stats \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Test 3: Election Details

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click on a completed election
2. ✅ See candidates, vote counts, winner

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Get election results
curl -s https://ams.14.jugaar.ai/api/v1/elections/{election_id}/results \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

---

## Related

- [Modules: Elections](../modules/elections)
- [Testing: Members](./members)
