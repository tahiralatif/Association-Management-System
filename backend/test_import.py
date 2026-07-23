#!/usr/bin/env python3
import sys
try:
    from app.main import app
    result = f"Routes: {len(app.routes)}\nAll imports OK\n"
except Exception as e:
    result = f"ERROR: {type(e).__name__}: {str(e)[:500]}\n"

with open("/tmp/import_result.txt", "w") as f:
    f.write(result)
