---
sidebar_position: 33
title: Troubleshooting
---

# Troubleshooting

## Login Issues

### "Invalid credentials" on login

**Causes:**
1. Wrong email or password
2. Wrong tenant ID
3. User doesn't exist

**Fix:**
```bash
# Check if user exists
psql -U assochub -d assochub -c "SELECT email, tenant_id, is_active FROM users WHERE email='your@email.com'"

# Verify password hash
curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"***","tenant_id":"default"}'
```

### Cannot login to demo accounts

**Demo accounts:**
- `demo@assochub.com` / `***` / tenant: `default`
- `daniel.harris@example.com` / `***` / tenant: `demo-association`

:::warning
Note the tenant IDs are different!
:::

## 401 Unauthorized

**Cause:** Token is missing, expired, or invalid.

**Fix:**
```bash
# Re-login to get a fresh token
TOKEN=$(curl -s -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"daniel.harris@example.com","password":"***","tenant_id":"demo-association"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Verify token works
curl -s http://localhost:8002/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

## 403 Forbidden

**Cause:** Your role doesn't have permission for this endpoint.

**Fix:** You need a higher role. Contact your admin to promote you:

```bash
# Admin promotes user to staff
curl -X PUT http://localhost:8002/api/v1/members/{member_id}/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "staff"}'
```

## 500 Internal Server Error

**Causes:**
1. Database connection lost
2. Redis connection lost
3. Backend code error

**Diagnosis:**
```bash
# Check health
curl -s http://localhost:8002/health | python3 -m json.tool

# Check backend logs
journalctl -u ams-backend -n 50

# Check database
psql -U assochub -d assochub -c "SELECT 1"

# Check Redis
redis-cli ping
```

## Redis Connection Error

**Symptom:** Health check shows `redis: {"status": "error"}`

**Fix:**
```bash
# Start Redis
sudo systemctl start redis

# Or install if missing
sudo apt install redis-server
sudo systemctl enable redis
sudo systemctl start redis
```

## CORS Errors (Browser)

**Symptom:** `Access-Control-Allow-Origin` errors in browser console.

**Fix:** Check CORS configuration in backend. Ensure your frontend URL is allowed:
```bash
# In .env
CORS_ORIGINS=http://localhost:3002,https://ams.14.jugaar.ai
```

## Frontend Not Loading

```bash
# Check if frontend is running
sudo systemctl status ams-frontend

# Check port
lsof -i :3002

# Restart
sudo systemctl restart ams-frontend
```

## Database Connection Refused

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U assochub -d assochub -h localhost -c "SELECT 1"

# Check credentials
cat /etc/postgresql/*/main/pg_hba.conf
```

## Celery Workers Not Running

**Symptom:** Background tasks (workflow triggers, email sends) not executing.

```bash
# Check Celery workers
ps aux | grep celery

# Start workers
cd /root/.openclaw/workspace/ams-project/backend
celery -A app.core.tasks worker --loglevel=info &

# Or via systemd
sudo systemctl start ams-celery
```

## AI Chat Not Working

**Symptom:** `/ai/chat` returns 500 or empty response.

**Fix:**
1. Check Groq API key is set: `echo $GROQ_API_KEY`
2. Test API key: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`
3. Check backend logs for API errors

## Reset Admin Password

```bash
# Generate new password hash
cd /root/.openclaw/workspace/ams-project/backend
source venv/bin/activate
python3 -c "
from app.core.auth import hash_password
print(hash_password('NewPassword123!'))
"

# Update in database
psql -U assochub -d assochub -c "
  UPDATE users SET hashed_password = 'PASTE_HASH_HERE'
  WHERE email = 'daniel.harris@example.com'
"
```
