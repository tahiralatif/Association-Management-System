#!/usr/bin/env python3
"""Quick login debug."""
import time
from camoufox.sync_api import Camoufox

BASE = "https://ams.14.jugaar.ai"

with Camoufox(headless=True, geoip=False) as browser:
    page = browser.new_page()
    
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    time.sleep(3)
    
    # Take screenshot of login page
    page.screenshot(path="/tmp/login_debug.png", full_page=True)
    
    # Check what inputs are available
    inputs = page.locator("input")
    count = inputs.count()
    print(f"Inputs found: {count}")
    for i in range(count):
        inp = inputs.nth(i)
        print(f"  Input {i}: type={inp.get_attribute('type')}, name={inp.get_attribute('name')}, placeholder={inp.get_attribute('placeholder')}")
    
    # Check buttons
    buttons = page.locator("button")
    for i in range(buttons.count()):
        btn = buttons.nth(i)
        print(f"  Button {i}: text={btn.inner_text()[:50]}, type={btn.get_attribute('type')}")
    
    # Try filling form
    email_el = page.locator("input[type='email']")
    if email_el.count() > 0:
        email_el.fill("daniel.harris@example.com")
        page.locator("input[type='password']").first.fill("Demo1234!")
        time.sleep(1)
        page.screenshot(path="/tmp/login_filled.png", full_page=True)
        
        # Click submit
        page.locator("button[type='submit']").click()
        time.sleep(5)
        
        # Check token
        token = page.evaluate("localStorage.getItem('auth_token')")
        print(f"\nToken after login: {'YES' if token else 'NO'}")
        print(f"Token value: {token[:50] if token else 'none'}...")
        
        # Check current URL
        print(f"Current URL: {page.url}")
        
        # Check for error messages
        error_el = page.locator(".bg-red-50, [role='alert'], .text-red-500, .text-red-700")
        if error_el.count() > 0:
            for i in range(error_el.count()):
                print(f"Error element {i}: {error_el.nth(i).inner_text()[:200]}")
        
        page.screenshot(path="/tmp/login_after.png", full_page=True)
    else:
        print("No email input found!")
    
    browser.close()
