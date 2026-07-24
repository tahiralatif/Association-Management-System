---
sidebar_position: 17
title: Auth Flow
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Testing: Authentication

Test the full auth flow: register, verify email, login, logout.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## Test 1: Login

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to **[https://ams.14.jugaar.ai/login](https://ams.14.jugaar.ai/login)**
2. Enter `daniel.harris@example.com` as email
3. Enter `Demo1234!` as password
4. Enter `demo-association` as tenant
5. Click **Sign In**
6. ✅ You should see the Dashboard

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "daniel.harris@example.com",
    "password": "Demo1234!",
    "tenant_id": "demo-association"
  }'
```

**Expected: 200 OK** with `access_token` and `user` object.

</TabItem>
</Tabs>

---

## Test 2: Register (New User)

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Get Started** on the landing page
2. Fill in:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `testuser@example.com`
   - Tenant ID: `demo-association`
   - Password: `MySecure123!`
   - Confirm Password: `MySecure123!`
3. Click **Create Account**
4. ✅ You should see "Check Your Email" screen
5. Check your inbox for a verification email
6. Click the verification link
7. ✅ Email verified — go to login

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Register
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "testuser@example.com",
    "tenant_id": "demo-association",
    "password": "MySecure123!",
    "confirm_password": "MySecure123!"
  }'
```

**Expected: 201 Created**

```bash
# Verify email (use token from email)
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_EMAIL"}'
```

**Expected: 200 OK**

</TabItem>
</Tabs>

---

## Test 3: Get Current User

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

After login, your name and role appear in the top bar. No action needed — this is automatic.

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
curl -s https://ams.14.jugaar.ai/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected: 200 OK** with user profile including roles.

</TabItem>
</Tabs>

---

## Test 4: Email Verification Errors

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Try to login with an **unverified** account
2. ✅ You should see an error: "Please verify your email before logging in"
3. ✅ A "Resend verification email" button appears
4. Click it to resend

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Try to login before verification (should fail)
curl -s -X POST https://ams.14.jugaar.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "password": "SomePassword123!",
    "tenant_id": "demo-association"
  }'
```

**Expected: 403 Forbidden** with message about email verification.

```bash
# Resend verification
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "unverified@example.com", "tenant_id": "demo-association"}'
```

**Expected: 200 OK** (generic message to prevent enumeration)

</TabItem>
</Tabs>

---

## Test 5: Logout

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Logout** in the sidebar
2. ✅ You're back on the landing page
3. ✅ The navbar shows "Sign In" instead of "Dashboard"

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

No server-side logout. Simply discard the token:
```bash
unset TOKEN
```

</TabItem>
</Tabs>

---

## Test 6: Protected Routes

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Log out
2. Try to go directly to `https://ams.14.jugaar.ai/dashboard`
3. ✅ You should be redirected to the login page

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Try to access protected endpoint without token
curl -s -o /dev/null -w "%{http_code}" https://ams.14.jugaar.ai/api/v1/members/
```

**Expected: 401 Unauthorized**

</TabItem>
</Tabs>

---

## Test 7: Password Validation

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to Register
2. Try a weak password like `123`
3. ✅ You should see a clear error message about password requirements

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Try weak password
curl -s -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "weak@example.com",
    "tenant_id": "demo-association",
    "password": "123",
    "confirm_password": "123"
  }'
```

**Expected: 422 Unprocessable Entity** with validation error details.

Password requirements: uppercase, lowercase, special character, 8+ characters.

</TabItem>
</Tabs>

---

## Summary

| Test | Easy Result | API Result |
|---|---|---|
| Login | Dashboard appears | 200 + token |
| Register | "Check Your Email" screen | 201 + user_id |
| Get User | Name in top bar | 200 + profile |
| Verify Errors | Error + resend button | 403 |
| Logout | Back to landing page | N/A |
| Protected Routes | Redirect to login | 401 |
| Password Validation | Clear error message | 422 |

---

## Related

- [Getting Started](../getting-started)
- [Testing: Members](./members)
- [Troubleshooting](../troubleshooting)
