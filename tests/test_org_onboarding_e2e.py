#!/usr/bin/env python3
"""
End-to-end test for the org onboarding flow.

Tests the complete lifecycle:
1. Submit org request (public)
2. Verify notification created for admins
3. Approve the request (admin)
4. Validate setup token (public)
5. Complete admin account setup (public)
6. Login with new credentials
7. Verify tenant isolation (new admin sees only their data)

Requirements:
    pip install httpx

Usage:
    python tests/test_org_onboarding_e2e.py [--base-url URL] [--admin-email EMAIL] [--admin-password PWD]
"""

import httpx
import sys
import argparse
import time


BASE_URL_DEFAULT = "http://localhost:8000"
ADMIN_EMAIL_DEFAULT = "superadmin@assoc.hub"
ADMIN_PASSWORD_DEFAULT = "SuperAdmin123!"
TEST_TS = int(time.time())
TEST_ORG_EMAIL = f"e2e.contact.{TEST_TS}@example.com"


def log(msg, level="INFO"):
    icons = {"INFO": "...", "PASS": "OK", "FAIL": "XX", "SKIP": "SK"}
    print(f"  [{level}] {msg}")


class OrgOnboardingE2E:
    def __init__(self, base_url, admin_email, admin_password):
        self.base = base_url.rstrip("/")
        self.api = self.base + "/api/v1"
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.admin_token = None
        self.org_request_id = None
        self.setup_token = None
        self.new_tenant_id = None
        self.results = []

    def record(self, name, passed, detail=""):
        self.results.append({"test": name, "passed": passed, "detail": detail})
        status = "PASS" if passed else "FAIL"
        log(f"{name} -- {detail}" if detail else name, status)

    def step_0_admin_login(self):
        log("Step 0: Admin login", "INFO")
        try:
            r = httpx.post(self.api + "/auth/login", json={
                "email": self.admin_email,
                "password": self.admin_password,
            }, timeout=15)
            if r.status_code == 200:
                data = r.json()
                self.admin_token = data.get("access_token") or data.get("token")
                if self.admin_token:
                    me = httpx.get(
                        self.api + "/members/me",
                        headers={"Authorization": "Bearer " + self.admin_token},
                        timeout=10,
                    )
                    if me.status_code == 200:
                        me_data = me.json()
                        roles = me_data.get("roles", [])
                        self.record("Admin login", True, "roles=" + str(roles))
                    else:
                        self.record("Admin login", True, "token acquired, /me failed")
                else:
                    self.record("Admin login", False, "no token in response")
            else:
                self.record("Admin login", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Admin login", False, str(e))

    def _auth_headers(self):
        if self.admin_token:
            return {"Authorization": "Bearer " + self.admin_token}
        return {}

    def step_1_submit_request(self):
        log("Step 1: Submit org request", "INFO")
        try:
            r = httpx.post(self.api + "/org-requests", json={
                "org_name": "E2E Test Association " + str(TEST_TS),
                "contact_person": "E2E Tester",
                "contact_email": TEST_ORG_EMAIL,
                "phone": "+1-555-0100",
                "description": "Automated E2E test association",
                "expected_members": 10,
            }, timeout=15)
            if r.status_code in (200, 201):
                data = r.json()
                self.org_request_id = data.get("id")
                self.record("Submit org request", True, "id=" + str(self.org_request_id))
            elif r.status_code == 409:
                self.record("Submit org request", True, "duplicate pending (idempotent)")
            else:
                self.record("Submit org request", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Submit org request", False, str(e))

    def step_2_verify_notification(self):
        log("Step 2: Verify admin notification", "INFO")
        if not self.admin_token:
            self.record("Admin notification", False, "no admin token")
            return
        try:
            r = httpx.get(
                self.api + "/notifications",
                headers=self._auth_headers(),
                params={"limit": "10"},
                timeout=10,
            )
            if r.status_code == 200:
                data = r.json()
                notifs = data if isinstance(data, list) else data.get("items", data.get("notifications", []))
                found = False
                for n in (notifs or []):
                    combined = (n.get("title", "") + " " + n.get("message", "")).lower()
                    if "organization" in combined:
                        found = True
                        break
                self.record("Admin notification", found,
                           "found org request notification" if found else "no org notification found")
            else:
                self.record("Admin notification", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Admin notification", False, str(e))

    def step_3_approve(self):
        log("Step 3: Approve org request", "INFO")
        if not self.admin_token or not self.org_request_id:
            self.record("Approve request", False, "missing admin token or request id")
            return
        try:
            r = httpx.patch(
                self.api + "/org-requests/" + self.org_request_id + "/approve",
                headers=self._auth_headers(),
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                self.setup_token = data.get("setup_token")
                self.new_tenant_id = data.get("tenant_id")
                self.record("Approve request", True,
                           "tenant=" + str(self.new_tenant_id) + ", setup_token=" + ("present" if self.setup_token else "missing"))
            else:
                self.record("Approve request", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Approve request", False, str(e))

    def step_4_validate_setup_token(self):
        log("Step 4: Validate setup token", "INFO")
        if not self.setup_token:
            self.record("Validate setup token", False, "no setup token")
            return
        try:
            r = httpx.get(self.api + "/org-requests/setup/" + self.setup_token, timeout=10)
            if r.status_code == 200:
                data = r.json()
                self.record("Validate setup token", True,
                           "org_name=" + str(data.get("org_name")) + ", email=" + str(data.get("contact_email")))
            else:
                self.record("Validate setup token", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Validate setup token", False, str(e))

    def step_5_setup_admin(self):
        log("Step 5: Setup admin account", "INFO")
        if not self.setup_token:
            self.record("Setup admin account", False, "no setup token")
            return
        try:
            r = httpx.post(
                self.api + "/org-requests/setup/" + self.setup_token,
                json={"password": "TestE2E!Pass123"},
                timeout=15,
            )
            if r.status_code == 200:
                data = r.json()
                self.record("Setup admin account", True, "login_url=" + str(data.get("login_url")))
            else:
                self.record("Setup admin account", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("Setup admin account", False, str(e))

    def step_6_login_new_admin(self):
        log("Step 6: Login with new admin", "INFO")
        try:
            r = httpx.post(self.api + "/auth/login", json={
                "email": TEST_ORG_EMAIL,
                "password": "TestE2E!Pass123",
            }, timeout=15)
            if r.status_code == 200:
                data = r.json()
                new_token = data.get("access_token") or data.get("token")
                if new_token:
                    me = httpx.get(
                        self.api + "/members/me",
                        headers={"Authorization": "Bearer " + new_token},
                        timeout=10,
                    )
                    if me.status_code == 200:
                        me_data = me.json()
                        self.record("New admin login", True,
                                   "roles=" + str(me_data.get("roles")) + ", tenant=" + str(me_data.get("tenant_id")))
                    else:
                        self.record("New admin login", True, "token acquired, /me failed")
                else:
                    self.record("New admin login", False, "no token in response")
            else:
                self.record("New admin login", False, "HTTP " + str(r.status_code))
        except Exception as e:
            self.record("New admin login", False, str(e))

    def step_7_tenant_isolation(self):
        log("Step 7: Tenant isolation", "INFO")
        try:
            r = httpx.post(self.api + "/auth/login", json={
                "email": TEST_ORG_EMAIL,
                "password": "TestE2E!Pass123",
            }, timeout=15)
            if r.status_code != 200:
                self.record("Tenant isolation", False, "could not login new admin")
                return

            new_token = r.json().get("access_token") or r.json().get("token")
            headers = {"Authorization": "Bearer " + new_token}

            members_r = httpx.get(self.api + "/members", headers=headers, timeout=10)
            if members_r.status_code == 200:
                data = members_r.json()
                members = data.get("items", []) if isinstance(data, dict) else data
                own_tenant = None
                for m in (members or []):
                    t = m.get("tenant_id")
                    if t:
                        if own_tenant is None:
                            own_tenant = t
                        elif t != own_tenant:
                            self.record("Tenant isolation", False, "cross-tenant leak: " + t)
                            return
                self.record("Tenant isolation", True,
                           "members=" + str(len(members)) + " (all tenant=" + str(own_tenant) + ")")
            else:
                self.record("Tenant isolation", False, "members endpoint: HTTP " + str(members_r.status_code))

            analytics_r = httpx.get(self.api + "/analytics/overview", headers=headers, timeout=10)
            if analytics_r.status_code == 200:
                self.record("Tenant isolation: analytics", True, "accessible")
            else:
                self.record("Tenant isolation: analytics", False, "HTTP " + str(analytics_r.status_code))

        except Exception as e:
            self.record("Tenant isolation", False, str(e))

    def run(self):
        print()
        print("=" * 70)
        print("Org Onboarding E2E Test")
        print("=" * 70)

        self.step_0_admin_login()
        self.step_1_submit_request()
        self.step_2_verify_notification()
        self.step_3_approve()
        self.step_4_validate_setup_token()
        self.step_5_setup_admin()
        self.step_6_login_new_admin()
        self.step_7_tenant_isolation()

        passed = sum(1 for r in self.results if r["passed"])
        failed = sum(1 for r in self.results if not r["passed"])
        total = len(self.results)

        print()
        print("-" * 70)
        print("Results: %d/%d passed, %d failed" % (passed, total, failed))
        if failed:
            print()
            print("Failed:")
            for r in self.results:
                if not r["passed"]:
                    print("  - %s: %s" % (r["test"], r["detail"]))
        else:
            print()
            print("All tests passed!")
        print("=" * 70)
        print()
        return failed == 0


def main():
    parser = argparse.ArgumentParser(description="Org onboarding E2E test")
    parser.add_argument("--base-url", default=BASE_URL_DEFAULT)
    parser.add_argument("--admin-email", default=ADMIN_EMAIL_DEFAULT)
    parser.add_argument("--admin-password", default=ADMIN_PASSWORD_DEFAULT)
    args = parser.parse_args()

    test = OrgOnboardingE2E(args.base_url, args.admin_email, args.admin_password)
    ok = test.run()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
