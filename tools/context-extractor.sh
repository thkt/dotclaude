#!/bin/bash
# Extract file changes from session JSONL
# Usage: context-extractor.sh <session.jsonl>
set -euo pipefail

if ! command -v jaq &> /dev/null; then
  echo "Error: jaq is required. Install: brew install jaq" >&2
  exit 1
fi

SESSION_FILE="${1:-}"

if [ -z "$SESSION_FILE" ]; then
  echo "Usage: context-extractor.sh <session.jsonl>" >&2
  exit 1
fi

if [ ! -f "$SESSION_FILE" ]; then
  echo "Error: File not found: $SESSION_FILE" >&2
  exit 1
fi

if [ ! -s "$SESSION_FILE" ]; then
  echo "Error: File is empty: $SESSION_FILE" >&2
  exit 1
fi

echo "# Changed files:"
jaq -r 'try (.message.content[]? | select(.name == "Write" or .name == "Edit") | .input.file_path) catch empty' "$SESSION_FILE" 2>/dev/null | sort -u | sed 's/^/- /'

# Extract user text messages
echo ""
echo "# User requests in this session:"
jaq -r 'try (select(.type == "user") | .message.content | if type == "string" then "- \(.[:150])" else empty end) catch empty' "$SESSION_FILE" 2>/dev/null | head -20
