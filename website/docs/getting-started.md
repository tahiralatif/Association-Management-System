---
sidebar_position: 2
title: Getting Started
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Getting Started with AssocHub

This guide walks you through your first interaction with AssocHub — from opening the website to exploring the dashboard.

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** (full access) | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** (limited access) | `demo@gmail.com` | `Demo1234!` | `demo-association` |

:::info
The admin account has full access to every module and feature. Use it to explore everything.
:::

---

## Step 1: Open AssocHub

🌐 Go to **[https://ams.14.jugaar.ai](https://ams.14.jugaar.ai)**

You'll see the landing page with feature highlights and two buttons: **Get Started** and **Sign In**.

## Step 2: Log In

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Sign In** (top-right corner)
2. You'll see a login form with a demo credentials box at the bottom
3. **Copy the admin email** from the hint box: `daniel.harris@example.com`
4. **Copy the password**: `Demo1234!`
5. **Copy the tenant ID**: `demo-association`
6. Paste all three into the form
7. Click **Sign In**
8. You're on the Dashboard! 🎉

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Login via API
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
    "id": "uuid-here",
    "email": "daniel.harris@example.com",
    "first_name": "Daniel",
    "last_name": "Harris",
    "roles": [{"role": "super_admin", "tenant_id": "demo-association"}]
  }
}
```

Save the token for API calls:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

</TabItem>
</Tabs>

## Step 3: Explore the Dashboard

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

After login you land on the **Dashboard** — your home base:

- **Top cards** show key numbers: active members, total revenue, upcoming events
- **Left sidebar** has links to all modules (Members, Finances, Events, etc.)
- **Top-right** shows your name and a logout button

**Click around!** Try each sidebar link to see what's in each module.

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Get dashboard overview
curl -s https://ams.14.jugaar.ai/api/v1/analytics/overview \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

```bash
# Get KPI data
curl -s https://ams.14.jugaar.ai/api/v1/analytics/dashboards \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

</TabItem>
</Tabs>

## Step 4: Navigate the Sidebar

The left sidebar contains links to every module. Here's what each one does:

| Sidebar Link | What You'll Find | Who Can Use It |
|---|---|---|
| **Dashboard** | Overview of everything | Everyone |
| **Members** | People in your organization | Staff+ |
| **Finances** | Money — invoices, budgets, payments | Staff+ |
| **Events** | Conferences, meetings, workshops | Staff+ |
| **Communications** | Emails, announcements, surveys | Staff+ |
| **Elections** | Voting and nominations | Staff+ |
| **Documents** | Files and folders | Everyone |
| **Workflows** | Automation rules | Staff+ |
| **AI Engine** | Ask questions, get predictions | Everyone |
| **Analytics** | Charts and reports | Staff+ |
| **Integrations** | Connect to other services | Admin+ |

:::tip
Modules marked "Staff+" require admin or staff role. The demo admin account has access to everything.
:::

## Step 5: Try the AI Chat

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **AI Engine** in the sidebar
2. You'll see a chat interface
3. Type a question like: "How many active members do we have?"
4. Press Enter
5. The AI answers using your actual data!

Try these questions:
- "What events are coming up?"
- "Show me the revenue breakdown"
- "Any members at risk of leaving?"

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Ask the AI a question
curl -X POST https://ams.14.jugaar.ai/api/v1/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many active members do we have?"}'
```

```bash
# Get AI health status
curl -s https://ams.14.jugaar.ai/api/v1/ai/health \
  -H "Authorization: Bearer $TOKEN"
```

```bash
# Get AI-generated insights
curl -s https://ams.14.jugaar.ai/api/v1/ai/insights \
  -H "Authorization: Bearer $TOKEN"
```

</TabItem>
</Tabs>

## Step 6: Register a New Account (Optional)

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. **Log out** (click Logout in the sidebar)
2. Click **Get Started** on the landing page
3. Fill in the form:

| Field | Value |
|---|---|
| First Name | `Test` |
| Last Name | `User` |
| Email | `test@example.com` |
| Tenant ID | `demo-association` |
| Password | `MySecure123!` |
| Confirm Password | `MySecure123!` |

4. Click **Create Account**
5. You'll see "Check Your Email" — check your inbox for the verification link
6. Click the verification link in the email
7. Go back to login and sign in

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

```bash
# Register a new user
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
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

```bash
# Verify email (use the token from the email)
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "token-from-email"}'

# Then login normally
```

</TabItem>
</Tabs>

## Step 7: Log Out

<Tabs>
<TabItem value="easy" label="🟢 Easy — Click Around">

1. Click **Logout** in the sidebar (or your name → Logout)
2. You're back on the landing page
3. Your session is cleared

</TabItem>
<TabItem value="hard" label="🔵 Advanced — API / Code">

There's no server-side logout endpoint. Simply discard the token:
```bash
unset TOKEN
```

In the browser, the frontend clears localStorage on logout.

</TabItem>
</Tabs>

---

## What's Next?

- **Explore modules:** Start with [Members](./modules/members) or [Events](./modules/events)
- **Test everything:** Follow the [Testing Guide](./testing/overview) for step-by-step verification
- **API access:** See the [API Reference](./api-reference) for programmatic access
- **Why AssocHub?** See [ams.14.jugaar.ai/why](https://ams.14.jugaar.ai/why) for a feature comparison

---

## Account Types

| Role | What they can do |
|---|---|
| `member` | View profile, self-service, limited module access |
| `staff` | All member features + manage members, events, finances |
| `tenant_admin` | All staff features + admin settings, users, roles |
| `super_admin` | Full system access across all tenants |
