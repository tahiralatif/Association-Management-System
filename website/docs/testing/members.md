---
sidebar_position: 18
title: Members Testing
---

# Testing: Members Module

## Prerequisites

```bash
# Login as super_admin (required for member management)
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

API="http://localhost:8002/api/v1"
```

## Test 1: List Members

```bash
curl -s "$API/members/" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Paginated list with 23 members:
```json
{
  "total": 23,
  "items": [...]
}
```

## Test 2: Get Member Stats

```bash
curl -s "$API/members/stats" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Statistics object with member counts by type, status, etc.

## Test 3: Get Current User's Profile

```bash
curl -s "$API/members/me" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Profile with name, email, role, tags, groups.

## Test 4: Create a New Member

```bash
curl -s -X POST "$API/members/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "TestMember",
    "email": "jane-test@example.com",
    "phone": "+1-555-0199",
    "membership_type": "basic",
    "status": "active"
  }' | python3 -m json.tool
```

**Expected:** `HTTP 200/201` — Created member with UUID.

Save the member ID:
```bash
MEMBER_ID=$(curl -s -X POST "$API/members/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Temp","last_name":"Member","email":"temp-'$(date +%s)'@test.com","membership_type":"basic","status":"active"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "Created member: $MEMBER_ID"
```

## Test 5: Get Member by ID

```bash
curl -s "$API/members/$MEMBER_ID" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Full member profile.

## Test 6: Update Member

```bash
curl -s -X PUT "$API/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jane Updated","phone":"+1-555-0200"}' | python3 -m json.tool
```

**Expected:** `HTTP 200` — Updated member profile.

## Test 7: List Groups

```bash
curl -s "$API/members/groups" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — List of member groups.

## Test 8: List Tags

```bash
curl -s "$API/members/tags" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — List of tags.

## Test 9: Search Members

```bash
curl -s "$API/members/search?q=daniel" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `HTTP 200` — Search results matching "daniel".

## Test 10: Export Members

```bash
curl -s "$API/members/export?format=csv" \
  -H "Authorization: Bearer $TOKEN" -o members-export.csv
echo "Exported $(wc -l < members-export.csv) lines"
```

**Expected:** `HTTP 200` — CSV file download.

## Test 11: Delete Member (Cleanup)

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" -X DELETE \
  "$API/members/$MEMBER_ID" -H "Authorization: Bearer $TOKEN"
```

**Expected:** `HTTP 200/204` — Member deleted.

## Test 12: Member as Regular User

```bash
# Login as demo user (member role)
MEMBER_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@assochub.com","password":"***","tenant_id":"default"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Can access own profile
curl -s -w "\nHTTP_STATUS: %{http_code}" "$API/members/me" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
# Expected: 200

# Cannot list all members (requires staff+)
curl -s -w "\nHTTP_STATUS: %{http_code}" "$API/members/" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
# Expected: 403

# Cannot see stats (requires staff+)
curl -s -w "\nHTTP_STATUS: %{http_code}" "$API/members/stats" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
# Expected: 403
```

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
PASS=0; FAIL=0

echo "=== Members Module Tests ==="

test_pass() { echo "✅ $1"; ((PASS++)); }
test_fail() { echo "❌ $1 (HTTP $2)"; ((FAIL++)); }

# List
C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/" -H "Authorization: Bearer $TOKEN")
[ "$C" = "200" ] && test_pass "List members" || test_fail "List members" "$C"

# Stats
C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/stats" -H "Authorization: Bearer $TOKEN")
[ "$C" = "200" ] && test_pass "Member stats" || test_fail "Member stats" "$C"

# Me
C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/me" -H "Authorization: Bearer $TOKEN")
[ "$C" = "200" ] && test_pass "Member me" || test_fail "Member me" "$C"

# Groups
C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/groups" -H "Authorization: Bearer $TOKEN")
[ "$C" = "200" ] && test_pass "List groups" || test_fail "List groups" "$C"

# Tags
C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/tags" -H "Authorization: Bearer $TOKEN")
[ "$C" = "200" ] && test_pass "List tags" || test_fail "List tags" "$C"

# Create
MID=$(curl -s -X POST "$API/members/" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Test\",\"last_name\":\"Member\",\"email\":\"tm-$(date +%s)@test.com\",\"membership_type\":\"basic\",\"status\":\"active\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
[ -n "$MID" ] && test_pass "Create member ($MID)" || test_fail "Create member" "N/A"

# Get by ID
if [ -n "$MID" ]; then
  C=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/$MID" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] && test_pass "Get member by ID" || test_fail "Get member by ID" "$C"
fi

# Delete
if [ -n "$MID" ]; then
  C=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API/members/$MID" -H "Authorization: Bearer $TOKEN")
  [ "$C" = "200" ] || [ "$C" = "204" ] && test_pass "Delete member" || test_fail "Delete member" "$C"
fi

echo ""
echo "Members Tests: $PASS passed, $FAIL failed"
```
