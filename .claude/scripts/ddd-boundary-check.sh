#!/bin/bash
file=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))")

if echo "$file" | grep -q '/server/domain/'; then
  result=$(grep -nE "from.*(infrastructure|application)" "$file" 2>/dev/null)
  if [ -n "$result" ]; then
    echo "DDD VIOLATION: domain layer has forbidden import in $file"
    echo "$result"
  fi
elif echo "$file" | grep -q '/server/application/'; then
  result=$(grep -n "from.*infrastructure" "$file" 2>/dev/null)
  if [ -n "$result" ]; then
    echo "DDD VIOLATION: application layer imports concrete infrastructure in $file"
    echo "$result"
  fi
fi
