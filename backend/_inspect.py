"""Dump all module files for inspection."""
import os

base = "/root/.openclaw/workspace/ams-project/backend/app/modules"
modules = ["finances", "events", "communications", "elections", "documents", "workflows", "ai", "integrations", "analytics"]

for mod in modules:
    modpath = os.path.join(base, mod)
    if not os.path.isdir(modpath):
        continue
    for fname in sorted(os.listdir(modpath)):
        if fname.endswith(".py") and fname != "__init__.py":
            fpath = os.path.join(modpath, fname)
            size = os.path.getsize(fpath)
            with open(fpath) as f:
                lines = f.readlines()
            print(f"FILE: {mod}/{fname} ({len(lines)} lines, {size} bytes)")
