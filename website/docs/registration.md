---
sidebar_position: 3
title: Registration
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Registration

Create a new AssocHub account.

## Demo Credentials (Existing Accounts)

Don't want to register? Use these instead:

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## How to Register

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to **[https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**
2. Click **Get Started** (or go to `/register`)
3. Fill in the form:

| Field | What to Enter |
|---|---|
| First Name | Your first name |
| Last Name | Your last name |
| Email | Your email address |
| Tenant ID | `demo-association` |
| Password | Must be 8+ chars, uppercase, lowercase, special character |
| Confirm Password | Same password |

4. Click **Create Account**
5. ✅ You'll see "Check Your Email" — check your inbox for a verification link
6. Click the verification link in the email
7. Go to the login page and sign in

:::tip
Password example: `MySecure123!` (uppercase M, lowercase y, special char !)
:::

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
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

**Expected (201):**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user_id": "uuid-here"
}
```

### Email Verification

After registration, you'll receive a verification email. The flow:

1. Register → user created with `email_verified=false`
2. Check email → click verification link
3. `/verify-email?token=***` → sets `email_verified=true`
4. Now you can log in

```bash
# Verify email (use token from the email link)
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_EMAIL"}'
```

```bash
# Resend verification if needed
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com", "tenant_id": "demo-association"}'
```

</TabItem>
</Tabs>

---

## Password Requirements

| Requirement | Example |
|---|---|
| At least 8 characters | `MySecure123!` ✅ |
| At least one uppercase | `M` ✅ |
| At least one lowercase | `y` ✅ |
| At least one special character | `!` ✅ |

---

## Account Types

New accounts get the `member` role by default. Admins can promote you to `staff` or `tenant_admin`.

| Role | Access Level |
|---|---|
| `member` | Profile, limited modules |
| `staff` | All modules (read/write) |
| `tenant_admin` | Staff + admin settings |
| `super_admin` | Full system access |

---

## Related

- [Login](./login)
- [Getting Started](./getting-started)
- [Testing: Auth Flow](./testing/auth-flow)
