---
sidebar_position: 17
title: Auth Flow Testing
---

# Testing: Authentication Flow

## Complete Auth Test Suite

### Test 1: Register New User

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "***",
    "first_name": "Test",
    "last_name": "User",
    "tenant_id": "default"
  }'
```

**Expected:** `HTTP 200` with `access_token`, `refresh_token`, `token_type`

### Test 2: Login (Super Admin)

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "***",
    "tenant_id": "demo-association"
  }'
```

**Expected:** `HTTP 200` with `access_token`

### Test 3: Get Current User

```bash
curl -s http://localhost:8002/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `HTTP 200` with user profile:
```json
{
  "email": "daniel.harris@example.com",
  "roles": ["super_admin"],
  "tenant_id": "demo-association"
}
```

### Test 4: Invalid Login (Wrong Password)

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "WrongPass123!",
    "tenant_id": "demo-association"
  }'
```

**Expected:** `HTTP 400` — `{"detail":"Invalid credentials"}`

### Test 5: Duplicate Registration

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@assochub.com",
    "password": "***",
    "first_name": "Dup",
    "last_name": "User",
    "tenant_id": "default"
  }'
```

**Expected:** `HTTP 400` or `HTTP 409` — Email already registered

### Test 6: Weak Password

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak-'$(date +%s)'@example.com",
    "password": "***",
    "first_name": "Weak",
    "last_name": "Pass",
    "tenant_id": "default"
  }'
```

**Expected:** `HTTP 400` — Password validation error

### Test 7: Change Password

```bash
# First, login and get fresh token
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "***",
    "new_password": "***"
  }'
```

**Expected:** `HTTP 200` — Password changed successfully

### Test 8: Forgot Password

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  -X POST http://localhost:8002/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@assochub.com"}'
```

**Expected:** `HTTP 200` — Password reset email sent

### Test 9: Access Protected Route Without Token

```bash
curl -s -w "\nHTTP_STATUS: %{http_code}" \
  http://localhost:8002/api/v1/members/
```

**Expected:** `HTTP 401` — `{"detail":"Not authenticated"}`

### Test 10: Access Admin Route with Member Role

```bash
# Login as demo user (member role)
MEMBER_TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@assochub.com","password":"***","tenant_id":"default"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -w "\nHTTP_STATUS: %{http_code}" \
  "http://localhost:8002/api/v1/members/stats" \
  -H "Authorization: Bearer $MEMBER_TOKEN"
```

**Expected:** `HTTP 403` — `{"detail":"Required roles: super_admin, tenant_admin, staff"}`

## Browser Flow Test

```
1. Open https://ams.14.jugaar.ai          → Landing page loads
2. Click "Get Started"                     → /register loads
3. Fill form and submit                    → Redirects to /dashboard
4. Click "Logout"                          → Redirects to /login
5. Enter credentials                       → Redirects to /dashboard
6. Close browser, open again               → / redirects to /login
```

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
PASS=0; FAIL=0

echo "=== Auth Flow Tests ==="

# Register
R=$(curl -s -w "|%{http_code}" -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"auto-test-$(date +%s)@example.com\",\"password\":\"***\",\"first_name\":\"Auto\",\"last_name\":\"Test\",\"tenant_id\":\"default\"}")
CODE=$(echo "$R" | cut -d'|' -f2)
[ "$CODE" = "200" ] && echo "✅ Register" && ((PASS++)) || echo "❌ Register (HTTP $CODE)" && ((FAIL++))

# Login as super_admin
R=$(curl -s -w "|%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}')
CODE=$(echo "$R" | cut -d'|' -f2)
TOKEN=$(echo "$R" | cut -d'|' -f1 | python3 -c "import sys,json;print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
[ "$CODE" = "200" ] && echo "✅ Login" && ((PASS++)) || echo "❌ Login (HTTP $CODE)" && ((FAIL++))

# Auth/me
R=$(curl -s -w "|%{http_code}" "$API/auth/me" -H "Authorization: Bearer $TOKEN")
CODE=$(echo "$R" | cut -d'|' -f2)
[ "$CODE" = "200" ] && echo "✅ Auth/me" && ((PASS++)) || echo "❌ Auth/me (HTTP $CODE)" && ((FAIL++))

# No token
R=$(curl -s -w "|%{http_code}" "$API/members/")
CODE=$(echo "$R" | cut -d'|' -f2)
[ "$CODE" = "401" ] && echo "✅ No token → 401" && ((PASS++)) || echo "❌ No token (HTTP $CODE)" && ((FAIL++))

# Wrong password
R=$(curl -s -w "|%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}')
CODE=$(echo "$R" | cut -d'|' -f2)
[ "$CODE" = "400" ] && echo "✅ Wrong password → 400" && ((PASS++)) || echo "❌ Wrong password (HTTP $CODE)" && ((FAIL++))

echo ""
echo "Auth Tests: $PASS passed, $FAIL failed"
```
