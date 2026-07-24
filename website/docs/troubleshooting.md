---
sidebar_position: 30
title: Troubleshooting
---

# Troubleshooting

## Quick Reference

| Problem | Solution |
|---|---|
| Can't log in | Use `Demo1234!` (not `Admin123!`) and tenant `demo-association` |
| Password error | Needs uppercase + lowercase + special char + 8+ chars |
| "Email not verified" | Click "Resend verification email" on login page, then check inbox |
| Dashboard is empty | Log in as admin (`daniel.harris@example.com`), not as member |
| AI chat not working | Check AI health at `/api/v1/ai/health` |
| 307 redirect on API | Add trailing slash to URL (e.g., `/members/` not `/members`) |
| Emails not sending | Check SMTP config in backend `.env` |

## Demo Credentials

| Role | Email | Password | Tenant |
|---|---|---|---|
| **Admin** | `daniel.harris@example.com` | `Demo1234!` | `demo-association` |
| **Member** | `demo@gmail.com` | `Demo1234!` | `demo-association` |

---

## Login Issues

### "Invalid email or password"
- Double-check the email, password, and tenant ID
- The password is case-sensitive: `Demo1234!` (capital D, capital D, exclamation mark)
- Tenant must be exactly `demo-association`

### "Please verify your email before logging in"
- You registered but haven't verified yet
- Click "Resend verification email" on the login page
- Check your spam/junk folder for the verification link
- Click the link in the email to verify, then log in

### "An internal error occurred" (during registration)
- Your password doesn't meet requirements
- Use: uppercase + lowercase + special character + 8+ characters
- Example: `MySecure123!`

---

## API Issues

### 307 Redirect
All list endpoints require a trailing slash:
```bash
# ✅ Correct
curl https://ams.14.jugaar.ai/api/v1/members/

# ❌ Wrong — will return 307
curl https://ams.14.jugaar.ai/api/v1/members
```

### 401 Unauthorized
Your token expired or is missing. Log in again:
```bash
curl -X POST https://ams.14.jugaar.ai/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"Demo1234!","tenant_id":"demo-association"}'
```

### 404 Not Found
- Check the endpoint URL
- Ensure you're using the correct module path
- Some modules have double paths: `/finances/finances/invoices`

---

## AI Issues

### AI not responding
1. Check health: `curl https://ams.14.jugaar.ai/api/v1/ai/health`
2. If unhealthy, the LLM provider may be rate-limited
3. The system auto-fallbacks to other models

### AI gives generic answers
The AI queries your actual database. Make sure there's data in the system (members, events, finances).

---

## Related

- [FAQ](./faq)
- [Getting Started](./getting-started)
- [API Reference](./api-reference)
