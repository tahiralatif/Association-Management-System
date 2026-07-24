---
sidebar_position: 3
title: Registration
---

# Registration Guide

## How Registration Works

### Step 1: Navigate to Register

Visit `https://ams.14.jugaar.ai/register` or click **Get Started** on the landing page.

### Step 2: Fill the Form

| Field | Required | Description |
|---|---|---|
| First Name | ✅ | Your first name |
| Last Name | ✅ | Your last name |
| Email | ✅ | Used as your login identifier |
| Tenant ID | ✅ | Organization identifier (use `default` for the demo) |
| Password | ✅ | Must be 8+ chars with uppercase, lowercase, digit, special char |
| Confirm Password | ✅ | Must match password |

### Step 3: Submit

Click **Create Account**. The system will:
1. Validate all fields
2. Check email uniqueness
3. Hash your password with bcrypt
4. Create your user record
5. Generate a JWT access token
6. Fetch your user profile via `/auth/me`
7. Redirect you to the Dashboard

### Password Requirements

```
✅ At least 8 characters
✅ At least one uppercase letter (A-Z)
✅ At least one lowercase letter (a-z)
✅ At least one digit (0-9)
✅ At least one special character (!@#$%^&*)
❌ No common passwords (password1!, admin123!, etc.)
```

### After Registration

You'll land on the **Dashboard** with:
- Your name displayed in the sidebar
- `member` role assigned
- Access to self-service features

## Testing Registration

### Test 1: Successful Registration

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "tenant_id": "default"
  }'
```

**Expected:** `200 OK` with `access_token`, `refresh_token`, `token_type`

### Test 2: Duplicate Email

```bash
# Register the same email again
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@example.com",
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "tenant_id": "default"
  }'
```

**Expected:** `400 Bad Request` — "Email already registered"

### Test 3: Weak Password

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@example.com",
    "password": "123",
    "first_name": "Weak",
    "last_name": "Pass",
    "tenant_id": "default"
  }'
```

**Expected:** `400 Bad Request` — Password validation error

### Test 4: Missing Fields

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "partial@example.com"}'
```

**Expected:** `422 Validation Error` — Missing required fields

## Automated Test Script

```bash
#!/bin/bash
echo "=== Registration Tests ==="

# Test 1: Valid registration
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test-'$(date +%s)'@example.com","password":"TestPass123!","first_name":"Test","last_name":"User","tenant_id":"default"}')

echo "Test 1 - Valid registration: $([ "$RESULT" = "200" ] && echo "PASS ✅" || echo "FAIL ❌ (HTTP $RESULT)")"

# Test 2: Duplicate email
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@assochub.com","password":"TestPass123!","first_name":"Dup","last_name":"User","tenant_id":"default"}')

echo "Test 2 - Duplicate email: $([ "$RESULT" = "400" ] || [ "$RESULT" = "409" ] && echo "PASS ✅" || echo "FAIL ❌ (HTTP $RESULT)")"

# Test 3: Weak password
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"weak-'$(date +%s)'@example.com","password":"123","first_name":"Weak","last_name":"Pass","tenant_id":"default"}')

echo "Test 3 - Weak password: $([ "$RESULT" = "400" ] || [ "$RESULT" = "422" ] && echo "PASS ✅" || echo "FAIL ❌ (HTTP $RESULT)")"
```
