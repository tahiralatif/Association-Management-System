#!/usr/bin/env python3
"""Verify all backend imports work correctly."""
import sys
import os

results = []

def check(label, import_path):
    try:
        __import__(import_path)
        results.append(f"OK: {label}")
    except Exception as e:
        results.append(f"FAIL: {label} -> {type(e).__name__}: {str(e)[:100]}")

# Core
check("config", "app.config")
check("database", "app.core.database")
check("auth", "app.core.auth")
check("auth.router", "app.core.auth.router")
check("audit", "app.core.audit")
check("password", "app.core.password")
check("health", "app.core.health")
check("exceptions", "app.core.exceptions.handlers")
check("tenant_middleware", "app.core.middleware.tenant")
check("audit_middleware", "app.core.middleware.audit")
check("request_id_middleware", "app.core.middleware.request_id")
check("rate_limit", "app.core.middleware.rate_limit")

# Modules
for mod in ["members", "finances", "events", "communications", "elections",
            "documents", "analytics", "workflows", "ai", "integrations"]:
    check(f"{mod}.models", f"app.modules.{mod}.models")
    check(f"{mod}.schemas", f"app.modules.{mod}.schemas")
    check(f"{mod}.crud", f"app.modules.{mod}.crud")
    check(f"{mod}.router", f"app.modules.{mod}.router")

# Tasks
for task in ["email", "workflows", "analytics", "integrations", "ai"]:
    check(f"tasks.{task}", f"app.tasks.{task}")

# Main app
check("main", "app.main")

# Write results
with open("/tmp/import_results.txt", "w") as f:
    for r in results:
        f.write(r + "\n")
    
    # Count
    ok = sum(1 for r in results if r.startswith("OK"))
    fail = sum(1 for r in results if r.startswith("FAIL"))
    f.write(f"\n=== {ok} passed, {fail} failed out of {len(results)} ===\n")

print(f"Done. {ok} passed, {fail} failed.")
