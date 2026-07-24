---
sidebar_position: 18
title: Members
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Members

Test member management — create, read, update, delete, search, bulk operations.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |

---

## Test 1: List Members

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Log in as admin
2. Click **Members** in the sidebar
3. ✅ You should see a list of 78+ members
4. Scroll through the list

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/members/ \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected: 200 OK** with paginated member list.

</TabItem>
</Tabs>

---

## Test 2: Member Statistics

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. In the Members module, look for a stats/summary section
2. ✅ See total members, active vs inactive breakdown

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/members/stats \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected: 200 OK** with counts by status, type, and group.

</TabItem>
</Tabs>

---

## Test 3: Search Members

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. In the Members module, use the search bar
2. Type a name (e.g., "Daniel")
3. ✅ Results filter to matching members

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s "https://ams.14.jugaar.ai/api/v1/members/search?q=daniel" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected: 200 OK** with matching members.

</TabItem>
</Tabs>

---

## Test 4: Groups

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Look for a "Groups" section in Members
2. ✅ See pre-existing groups (committees, boards)
3. Click a group to see its members

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# List groups
curl -s https://ams.14.jugaar.ai/api/v1/members/groups \
  -H "Authorization: Bearer $TOKEN"

# Create group
curl -X POST https://ams.14.jugaar.ai/api/v1/members/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Group", "description": "Testing group creation"}'
```

</TabItem>
</Tabs>

---

## Test 5: Tags

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Look for tags on member profiles (colored labels)
2. ✅ See tags like "VIP", "board-member", "speaker"

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# List tags
curl -s https://ams.14.jugaar.ai/api/v1/members/tags \
  -H "Authorization: Bearer $TOKEN"

# Create tag
curl -X POST https://ams.14.jugaar.ai/api/v1/members/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-tag", "color": "#0d9488"}'
```

</TabItem>
</Tabs>

---

## Test 6: Import/Export

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Look for "Export" button in the Members module
2. ✅ Download member list as CSV or JSON

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Export members
curl -s https://ams.14.jugaar.ai/api/v1/members/export \
  -H "Authorization: Bearer $TOKEN" -o members.csv

# Import from CSV
curl -X POST https://ams.14.jugaar.ai/api/v1/members/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@members.csv"
```

</TabItem>
</Tabs>

---

## Expected Results

| Test | Easy | API |
|---|---|---|
| List | See member cards/table | 200 + items array |
| Stats | Numbers on screen | 200 + stat object |
| Search | Filtered results | 200 + filtered array |
| Groups | Group list with members | 200 + groups array |
| Tags | Colored labels on profiles | 200 + tags array |
| Export | File downloads | 200 + CSV/JSON |

---

## Related

- [Modules: Members](../modules/members)
- [Testing: Auth Flow](./auth-flow)
