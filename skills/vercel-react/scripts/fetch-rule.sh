#!/bin/bash
set -e

RULE="${1:?Usage: fetch-rule.sh <rule-name> [skill]}"
RULE="${RULE//[\/.]}"
SKILL="${2:-react-best-practices}"
SKILL="${SKILL//[\/.]}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/../cache/$SKILL"
CACHE_FILE="$CACHE_DIR/$RULE.md"

# Cache hit
if [[ -f "$CACHE_FILE" ]]; then
  echo "$CACHE_FILE"
  exit 0
fi

# Cache miss — fetch from GitHub
mkdir -p "$CACHE_DIR"
URL="https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/$SKILL/rules/$RULE.md"

if ! curl -sf --connect-timeout 5 --max-time 15 "$URL" -o "$CACHE_FILE"; then
  rm -f "$CACHE_FILE"
  echo "Error: Rule '$RULE' not found in skill '$SKILL'" >&2
  exit 1
fi

echo "$CACHE_FILE"
