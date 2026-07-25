#!/bin/bash
# RBAC Test Script for AssocHub
# Tests permission enforcement across 3 role types

API="http://127.0.0.1:8002/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass=0
fail=0

check() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo -e "  ${GREEN}✅ $label${NC}"
    ((pass++))
  else
    echo -e "  ${RED}❌ $label (expected '$expected', got '$actual')${NC}"
    ((fail++))
  fi
}

login() {
  curl -s -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\",\"tenant_id\":\"$3\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAIL'))" 2>/dev/null
}

me() {
  curl -s "$API/auth/me" -H "Authorization: Bearer $1" | python3 -m json.tool 2>/dev/null
}

echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}  AssocHub RBAC Test Suite${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"

# ── Test 1: Super Admin Login & Permissions ──
echo -e "\n${YELLOW}▶ Test 1: Super Admin${NC}"
ADMIN_TOKEN=$(login "daniel.harris@example.com" "Admin123!" "demo-association")
if [ "$ADMIN_TOKEN" = "FAIL" ]; then
  echo -e "  ${RED}❌ Login failed${NC}"
  ((fail++))
else
  check "Super admin login" "eyJ" "$ADMIN_TOKEN"
  
  ADMIN_PERMS=$(me "$ADMIN_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('permissions',[])))")
  check "Super admin has 46 permissions" "46" "$ADMIN_PERMS"
  
  ADMIN_ROLES=$(me "$ADMIN_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('roles',[]))")
  check "Super admin role" "super_admin" "$ADMIN_ROLES"
  
  # Test protected endpoint
  MEMBERS_ACCESS=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/" -H "Authorization: Bearer $ADMIN_TOKEN")
  check "Super admin can list members (200)" "200" "$MEMBERS_ACCESS"
fi

# ── Test 2: Register a member ──
echo -e "\n${YELLOW}▶ Test 2: Member Registration & Permissions${NC}"
MEMBER_TOKEN=$(login "test-member-rbac@example.com" "Test123!" "demo-association" 2>/dev/null)

# Register fresh
REGISTER_RESP=$(curl -s -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"rbac-test-'$(date +%s)'@example.com","password":"Test123!","first_name":"RBAC","last_name":"Tester","tenant_id":"demo-association"}')
MEMBER_TOKEN=$(echo "$REGISTER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAIL'))" 2>/dev/null)

if [ "$MEMBER_TOKEN" = "FAIL" ]; then
  echo -e "  ${RED}❌ Member registration failed${NC}"
  ((fail++))
else
  check "Member registration" "eyJ" "$MEMBER_TOKEN"
  
  MEMBER_PERMS=$(me "$MEMBER_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('permissions',[])))")
  check "Member has exactly 8 permissions" "8" "$MEMBER_PERMS"
  
  # Members should have these specific permissions
  MEMBER_PERM_LIST=$(me "$MEMBER_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(' '.join(d.get('permissions',[])))")
  for p in "members:read" "events:read" "events:register" "documents:read" "elections:read" "elections:vote" "ai:chat" "communications:read"; do
    check "Member has '$p'" "$p" "$MEMBER_PERM_LIST"
  done
  
  # Members should NOT have admin permissions
  for p in "members:delete" "finances:write" "admin:all" "events:write"; do
    if echo "$MEMBER_PERM_LIST" | grep -q "$p"; then
      echo -e "  ${RED}❌ Member should NOT have '$p'${NC}"
      ((fail++))
    else
      echo -e "  ${GREEN}✅ Member correctly lacks '$p'${NC}"
      ((pass++))
    fi
  done
fi

# ── Test 3: /me/permissions endpoint ──
echo -e "\n${YELLOW}▶ Test 3: /me/permissions Endpoint${NC}"
PERMS_ENDPOINT=$(curl -s "$API/auth/me/permissions" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('permissions',[])))" 2>/dev/null)
check "/me/permissions returns 46 for admin" "46" "$PERMS_ENDPOINT"

# ── Test 4: JWT token contains permissions ──
echo -e "\n${YELLOW}▶ Test 4: JWT Token Contains Permissions${NC}"
JWT_PERMS=$(python3 -c "
import base64, json
payload = json.loads(base64.urlsafe_b64decode('$ADMIN_TOKEN'.split('.')[1] + '=='))
print(len(payload.get('permissions', [])))
" 2>/dev/null)
check "JWT embeds permissions" "46" "$JWT_PERMS"

JWT_ROLES=$(python3 -c "
import base64, json
payload = json.loads(base64.urlsafe_b64decode('$ADMIN_TOKEN'.split('.')[1] + '=='))
print(payload.get('roles', []))
" 2>/dev/null)
check "JWT contains roles" "super_admin" "$JWT_ROLES"

# ── Test 5: Unauthorized access ──
echo -e "\n${YELLOW}▶ Test 5: Unauthorized Access${NC}"
UNAUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/")
check "No token → 401" "401" "$UNAUTH_CODE"

BAD_TOKEN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/members/" -H "Authorization: Bearer invalid_token")
check "Bad token → 401" "401" "$BAD_TOKEN_CODE"

# ── Summary ──
echo -e "\n${YELLOW}═══════════════════════════════════════${NC}"
TOTAL=$((pass + fail))
if [ $fail -eq 0 ]; then
  echo -e "  ${GREEN}🎉 ALL $TOTAL TESTS PASSED${NC}"
else
  echo -e "  ${YELLOW}📊 Results: $pass passed, $fail failed (of $total)${NC}"
fi
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
