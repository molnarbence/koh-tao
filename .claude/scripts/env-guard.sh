#!/bin/bash
file=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))")
if echo "$file" | grep -qE '\.env(\.(local|production|staging))?$'; then
  echo "Blocked: do not edit .env files directly"
  exit 2
fi
