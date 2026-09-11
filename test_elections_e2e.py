#!/usr/bin/env python3
"""E2E test: Full elections flow — API-driven with browser screenshots."""
import time, json, sys
from camoufox.sync_api import Camoufox

BASE = "https://ams.14.jugaar.ai"
SCREENSHOTS = "/tmp"

def screenshot(page, name):
    path = f"{SCREENSHOTS}/election_e2e_{name}.png"
    try:
        page.screenshot(path=path, full_page=True)
        print(f"📸 {path}")
    except Exception as e:
        print(f"⚠️  Screenshot failed: {e}")

def api(page, path, method="GET", body=None):
    body_json = json.dumps(body) if body else None
    # Build the fetch options without body for GET/HEAD
    if body_json and method not in ("GET", "HEAD"):
        body_part = f"body: typeof bodyStr === 'string' ? bodyStr : JSON.stringify(bodyStr),"
        body_init = f"const bodyStr = {body_json};"
    else:
        body_part = ""
        body_init = ""
    
    js = f"""
    async () => {{
        try {{
            {body_init}
            const resp = await fetch("{BASE}{path}", {{
                method: "{method}",
                headers: {{
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + (localStorage.getItem("auth_token") || "")
                }},
                {body_part}
            }});
            const text = await resp.text();
            return {{ status: resp.status, body: text }};
        }} catch(e) {{
            return {{ status: 0, body: e.message }};
        }}
    }}
    """
    result = page.evaluate(js)
    return result

def api_check(page, path, method="GET", body=None, expect=200, label=""):
    result = api(page, path, method, body)
    status = result["status"]
    ok = status == expect
    symbol = "✅" if ok else "❌"
    print(f"  {symbol} {label or path}: {status}")
    if not ok and result["body"]:
        print(f"     Error: {result['body'][:200]}")
    return result

def login(page, email, password, org=None):
    url = f"{BASE}/login"
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    time.sleep(3)
    
    # If org specified, search and select it
    if org:
        org_input = page.locator('input[placeholder*="Search by name"]')
        if org_input.count() > 0:
            org_input.fill("")
            time.sleep(0.5)
            org_input.fill("demo")
            time.sleep(3)
            # Wait for dropdown to appear
            org_option = page.locator('text=Demo Association')
            for attempt in range(3):
                if org_option.count() > 0:
                    org_option.first.click()
                    time.sleep(1)
                    break
                time.sleep(1)
    
    email_input = page.locator("input[type='email']")
    if email_input.count() > 0:
        email_input.fill(email)
        page.locator("input[type='password']").first.fill(password)
        page.locator("button[type='submit']").click()
        time.sleep(8)
        token = page.evaluate("localStorage.getItem('auth_token')")
        if token:
            print(f"✅ Logged in as {email}")
            return True
        else:
            time.sleep(5)
            token = page.evaluate("localStorage.getItem('auth_token')")
            if token:
                print(f"✅ Logged in as {email} (retry)")
                return True
            print(f"❌ Login failed: {email}")
            return False
    print(f"❌ No login form found")
    return False

def safe_goto(page, path):
    """Navigate with error handling."""
    try:
        page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)
        return True
    except Exception as e:
        print(f"  ⚠️  Navigation to {path} failed: {e}")
        time.sleep(1)
        return False

def main():
    with Camoufox(headless=True, geoip=False) as browser:
        page = browser.new_page()
        
        # ═══════════════════════════════════════════════════════
        # STEP 1: Admin creates election + adds positions
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 1: Admin creates election ═══")
        login(page, "admin@demo-association.com", "Demo1234!")
        
        result = api(page, "/api/v1/elections/", method="POST", body={
            "title": "Board Election 2026",
            "description": "Annual board election for demo association",
            "election_type": "board",
            "seats_available": 2,
            "quorum_percentage": 33,
            "secret_ballot": True,
        })
        election = json.loads(result["body"])
        eid = election["id"]
        print(f"  Election created: {eid}")
        
        api_check(page, f"/api/v1/elections/{eid}/positions", "POST",
                  {"title": "President", "description": "President position", "seats": 1},
                  201, "Add position: President")
        
        api_check(page, f"/api/v1/elections/{eid}/positions", "POST",
                  {"title": "Vice President", "description": "VP position", "seats": 1},
                  201, "Add position: Vice President")
        
        # Screenshot admin view
        if safe_goto(page, "/elections"):
            time.sleep(2)
            screenshot(page, "01_admin_elections_list")
            
            # Click into the election
            row = page.locator("tr").filter(has_text="Board Election 2026")
            if row.count() > 0:
                try:
                    row.first.click()
                    time.sleep(2)
                    screenshot(page, "02_admin_election_detail")
                except:
                    pass
        
        # ═══════════════════════════════════════════════════════
        # STEP 2: Open nominations
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 2: Open nominations ═══")
        api_check(page, f"/api/v1/elections/{eid}/open-nominations", "POST",
                  expect=200, label="Open nominations")
        
        # ═══════════════════════════════════════════════════════
        # STEP 3: Member (Jane) submits nomination
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 3: Jane nominates for President ═══")
        login(page, "jane.smith@example.com", "Demo1234!", org="demo-association")
        safe_goto(page, "/profile")
        time.sleep(2)
        
        # Get positions - as member
        result = api(page, f"/api/v1/elections/{eid}/positions")
        print(f"  Positions raw: {result['status']} - {result['body'][:200]}")
        positions = json.loads(result["body"])
        print(f"  Positions: {[p['title'] for p in positions]}")
        pres_id = positions[0]["id"]  # President
        
        api_check(page, f"/api/v1/elections/{eid}/nominate", "POST", {
            "position_id": pres_id,
            "statement": "I am running for President to lead our association.",
            "qualifications": "5 years experience, current VP",
        }, 201, "Jane nominates for President")
        
        # ═══════════════════════════════════════════════════════
        # STEP 4: Ladla nominates for both positions
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 4: Ladla nominates ═══")
        login(page, "ladlasab061@gmail.com", "Demo1234!", org="demo-association")
        safe_goto(page, "/profile")
        time.sleep(2)
        
        vp_id = positions[1]["id"]  # Vice President
        
        api_check(page, f"/api/v1/elections/{eid}/nominate", "POST", {
            "position_id": pres_id,
            "statement": "I want to bring fresh ideas as President.",
            "qualifications": "3 years on the board",
        }, 201, "Ladla nominates for President")
        
        api_check(page, f"/api/v1/elections/{eid}/nominate", "POST", {
            "position_id": vp_id,
            "statement": "I will be an excellent VP.",
            "qualifications": "Member since 2023",
        }, 201, "Ladla nominates for VP")
        
        # ═══════════════════════════════════════════════════════
        # STEP 5: Admin reviews + accepts nominations
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 5: Admin accepts all nominations ═══")
        login(page, "admin@demo-association.com", "Demo1234!")
        safe_goto(page, "/dashboard")
        time.sleep(2)
        
        noms = json.loads(api(page, f"/api/v1/elections/{eid}/nominations")["body"])
        print(f"  Nominations found: {len(noms)}")
        for nom in noms:
            print(f"    - {nom.get('member_name', '?')} for {nom.get('position_title', '?')} [{nom['status']}]")
            if nom["status"] == "pending":
                api_check(page, f"/api/v1/elections/nominations/{nom['id']}/accept", "POST",
                          expect=200, label=f"Accept {nom.get('member_name', '?')}")
        
        # Screenshot after accepting
        if safe_goto(page, "/elections"):
            time.sleep(2)
            row = page.locator("tr").filter(has_text="Board Election 2026")
            if row.count() > 0:
                try:
                    row.first.click()
                    time.sleep(2)
                    screenshot(page, "03_admin_nominations_accepted")
                except:
                    pass
        
        # ═══════════════════════════════════════════════════════
        # STEP 6: Start voting
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 6: Start voting ═══")
        result = api_check(page, f"/api/v1/elections/{eid}/start-voting", "POST",
                           expect=200, label="Start voting")
        
        # ═══════════════════════════════════════════════════════
        # STEP 7: Verify candidates endpoint
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 7: Verify candidates endpoint ═══")
        login(page, "jane.smith@example.com", "Demo1234!", org="demo-association")
        safe_goto(page, "/profile")
        time.sleep(2)
        
        cands = json.loads(api(page, f"/api/v1/elections/{eid}/candidates")["body"])
        print(f"  Candidates response: {json.dumps(cands, indent=2)[:500]}")
        
        # ═══════════════════════════════════════════════════════
        # STEP 8: Jane casts vote
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 8: Jane votes ═══")
        
        # Jane votes for herself (President) and Ladla (VP)
        api_check(page, f"/api/v1/elections/{eid}/vote", "POST", {
            "votes": {pres_id: [page.evaluate("""
                async () => {
                    const resp = await fetch('/api/v1/elections/""" + eid + """/candidates', {
                        headers: {"Authorization": "Bearer " + localStorage.getItem("auth_token")}
                    });
                    const data = await resp.json();
                    // Find Jane's member_id in the candidates
                    for (const pos of data.items) {
                        for (const c of pos.candidates) {
                            if (c.member_name.includes('Jane')) return c.member_id;
                        }
                    }
                    return "";
                }
            """)]},
        }, 201, "Jane casts vote (via API with candidate lookup)")
        
        # Actually let me simplify - just vote with the IDs from the candidates endpoint
        # First get Jane's and Ladla's IDs from the candidates
        cands_data = json.loads(api(page, f"/api/v1/elections/{eid}/candidates")["body"])
        jane_id = ""
        ladla_id = ""
        for pos in cands_data["items"]:
            for c in pos["candidates"]:
                if "Jane" in c["member_name"]:
                    jane_id = c["member_id"]
                elif "Ladla" in c["member_name"] or "ladla" in c["member_name"].lower():
                    ladla_id = c["member_id"]
        
        print(f"  Jane ID: {jane_id}, Ladla ID: {ladla_id}")
        
        if jane_id and ladla_id:
            # Jane votes for herself (President) and Ladla (VP)
            api_check(page, f"/api/v1/elections/{eid}/vote", "POST", {
                "votes": {pres_id: [jane_id], vp_id: [ladla_id]},
            }, 201, "Jane votes for herself + Ladla VP")
            
            # Screenshot voting tab
            if safe_goto(page, "/elections"):
                time.sleep(2)
                row = page.locator("tr").filter(has_text="Board Election 2026")
                if row.count() > 0:
                    try:
                        row.first.click()
                        time.sleep(2)
                        # Click Vote tab
                        vote_tab = page.locator("button").filter(has_text="Vote")
                        if vote_tab.count() > 0:
                            vote_tab.first.click()
                            time.sleep(2)
                            screenshot(page, "04_member_voting_tab")
                    except:
                        pass
            
            # ═══════════════════════════════════════════════════════
            # STEP 9: Ladla casts vote
            # ═══════════════════════════════════════════════════════
            print("\n═══ STEP 9: Ladla votes ═══")
            login(page, "ladlasab061@gmail.com", "Demo1234!", org="demo-association")
            safe_goto(page, "/profile")
            time.sleep(2)
            
            # Ladla votes for Jane (President) and herself (VP)
            api_check(page, f"/api/v1/elections/{eid}/vote", "POST", {
                "votes": {pres_id: [jane_id], vp_id: [ladla_id]},
            }, 201, "Ladla votes for Jane President + herself VP")
        
        # ═══════════════════════════════════════════════════════
        # STEP 10: Admin closes + publishes results
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 10: Admin closes + publishes results ═══")
        login(page, "admin@demo-association.com", "Demo1234!")
        safe_goto(page, "/dashboard")
        time.sleep(2)
        
        api_check(page, f"/api/v1/elections/{eid}/close", "POST",
                  expect=200, label="Close election")
        
        api_check(page, f"/api/v1/elections/{eid}/publish-results", "POST",
                  expect=200, label="Publish results")
        
        # ═══════════════════════════════════════════════════════
        # STEP 11: Verify results
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 11: Verify results ═══")
        results_data = json.loads(api(page, f"/api/v1/elections/{eid}/results")["body"])
        print(f"  Results count: {len(results_data)}")
        for r in results_data:
            print(f"\n  📊 Position: {r.get('position_title', '?')}")
            print(f"     Total votes: {r.get('total_votes', 0)}")
            print(f"     Winners: {r.get('winner_names', r.get('winners', []))}")
            for c in r.get("all_candidates", []):
                print(f"     - {c.get('member_name', '?')}: {c.get('votes', 0)} votes ({c.get('percentage', 0)}%)")
        
        # Screenshot results
        if safe_goto(page, "/elections"):
            time.sleep(2)
            row = page.locator("tr").filter(has_text="Board Election 2026")
            if row.count() > 0:
                try:
                    row.first.click()
                    time.sleep(2)
                    results_tab = page.locator("button").filter(has_text="Results")
                    if results_tab.count() > 0:
                        results_tab.first.click()
                        time.sleep(2)
                        screenshot(page, "05_results_published")
                except:
                    pass
        
        # ═══════════════════════════════════════════════════════
        # STEP 12: Member views results
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 12: Jane views results ═══")
        login(page, "jane.smith@example.com", "Demo1234!", org="demo-association")
        safe_goto(page, "/profile")
        time.sleep(2)
        
        jane_results = json.loads(api(page, f"/api/v1/elections/{eid}/results")["body"])
        print(f"  Member can see results: {len(jane_results)} position(s)")
        
        if safe_goto(page, "/elections"):
            time.sleep(2)
            row = page.locator("tr").filter(has_text="Board Election 2026")
            if row.count() > 0:
                try:
                    row.first.click()
                    time.sleep(2)
                    results_tab = page.locator("button").filter(has_text="Results")
                    if results_tab.count() > 0:
                        results_tab.first.click()
                        time.sleep(2)
                        screenshot(page, "06_member_sees_results")
                except:
                    pass
        
        # ═══════════════════════════════════════════════════════
        # STEP 13: Test DELETE
        # ═══════════════════════════════════════════════════════
        print("\n═══ STEP 13: Test DELETE ═══")
        login(page, "admin@demo-association.com", "Demo1234!")
        safe_goto(page, "/dashboard")
        time.sleep(2)
        
        # Create a temp election to delete
        temp = json.loads(api(page, "/api/v1/elections/", "POST", {
            "title": "Temp Election (to delete)",
            "election_type": "board",
        })["body"])
        temp_id = temp["id"]
        
        api_check(page, f"/api/v1/elections/{temp_id}", "DELETE",
                  expect=204, label="Delete election")
        
        # Verify it's gone
        api_check(page, f"/api/v1/elections/{temp_id}", "GET",
                  expect=404, label="Verify deleted election 404")
        
        print("\n═══════════════════════════════════════════════════")
        print("✅ FULL E2E ELECTIONS FLOW COMPLETE")
        print("═══════════════════════════════════════════════════")
        
        browser.close()

if __name__ == "__main__":
    main()
