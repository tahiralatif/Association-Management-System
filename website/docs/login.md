---
sidebar_position: 4
title: Login
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Login

Access your AssocHub account.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** (full access) | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** (limited access) | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## How to Log In

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Go to **[https://ams.14.jugaar.ai/login](https://ams.14.jugaar.ai/login)**
2. You'll see a login form
3. **Look at the hint box** at the bottom of the form — it shows the demo credentials
4. Enter the email, password, and tenant ID from the table above
5. Click **Sign In**
6. ✅ You're on the Dashboard

:::tip
Use the **Admin** credentials to see all features. The Member account has limited access.
:::

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

**Expected response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "daniel.harris@example.com",
    "first_name": "Daniel",
    "last_name": "Harris",
    "roles": [{"role": "super_admin", "tenant_id": "demo-association"}]
  }
}
```

Save the token:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

</TabItem>
</Tabs>

---

## Troubleshooting

| Problem | Solution |
|---|---|
| "Invalid email or password" | Check email, password (`Demo1234!`), and tenant (`demo-association`) |
| "Email not verified" | Click "Resend verification email" on the login page |
| "Internal error" | Password doesn't meet requirements — use uppercase + lowercase + special char + 8+ chars |

See [Troubleshooting](./troubleshooting) for more help.

---

## Related

- [Registration](./registration)
- [Getting Started](./getting-started)
- [Testing: Auth Flow](./testing/auth-flow)
