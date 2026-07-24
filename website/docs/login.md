---
sidebar_position: 4
title: Login
---

# Login Guide

## How Login Works

### Step 1: Navigate to Login

Visit `https://ams.14.jugaar.ai/login` or click **Sign In** on the landing page.

### Step 2: Enter Credentials

| Field | Description | Example |
|---|---|---|
| Email | Your registered email | `admin@assochub.com` |
| Password | Your account password | `***` |
| Tenant ID | Organization identifier | `default` |

### Step 3: Sign In

Click **Sign In**. The system will:
1. Validate credentials against the database
2. Generate a JWT access token (24-hour expiry)
3. Fetch your user profile via `/auth/me`
4. Redirect you to the Dashboard

### Available Test Accounts

| Email | Password | Tenant ID | Role |
|---|---|---|---|
| `demo@assochub.com` | `***` | `default` | `member` |
| `daniel.harris@example.com` | `***` | `demo-association` | `super_admin` |

### Password Reset

If you forget your password, use the `/auth/forgot-password` endpoint:

```bash
curl -X POST http://localhost:8002/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
```

### Change Password

Once logged in, change your password:

```bash
curl -X POST http://localhost:8002/api/v1/auth/change-password \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "CurrentPass123!",
    "new_password": "NewSecure456!"
  }'
```

## Testing Login

### Test 1: Successful Login (Super Admin)

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "***",
    "tenant_id": "demo-association"
  }'
```

**Expected:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Test 2: Wrong Password

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "WrongPassword1!",
    "tenant_id": "demo-association"
  }'
```

**Expected:** `400 Bad Request` — `{"detail":"Invalid credentials"}`

### Test 3: Wrong Tenant ID

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "***",
    "tenant_id": "wrong-tenant"
  }'
```

**Expected:** `400 Bad Request` — `{"detail":"Invalid credentials"}`

### Test 4: Non-existent User

```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nobody@example.com",
    "password": "AnyPass123!",
    "tenant_id": "default"
  }'
```

**Expected:** `400 Bad Request` — `{"detail":"Invalid credentials"}`

## Session Management

- **Token Storage:** JWT stored in browser `localStorage`
- **Token Expiry:** 24 hours
- **Auto Logout:** On 401 response, user is redirected to `/login`
- **Public Routes:** `/`, `/login`, `/register`, `/marketing` — accessible without auth

## Automated Test Script

```bash
#!/bin/bash
API="http://localhost:8002/api/v1"
PASS=0; FAIL=0

echo "=== Login Tests ==="

# Test 1: Valid login
R=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "200" ] && echo "✅ Valid login" && ((PASS++)) || echo "❌ Valid login (HTTP $CODE)" && ((FAIL++))

# Test 2: Invalid credentials
R=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}')
CODE=$(echo "$R" | tail -1)
[ "$CODE" = "400" ] && echo "✅ Invalid credentials rejected" && ((PASS++)) || echo "❌ Invalid credentials (HTTP $CODE)" && ((FAIL++))

echo ""
echo "Results: $PASS passed, $FAIL failed"
```
