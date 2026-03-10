#!/bin/bash
set -e

SKILL="${1:-react-best-practices}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CACHE_DIR="$SCRIPT_DIR/../cache/$SKILL"
mkdir -p "$CACHE_DIR"

# Get rule file list from GitHub API (skip _-prefixed meta files)
RULES=$(gh api "repos/vercel-labs/agent-skills/contents/skills/$SKILL/rules" \
  --jq '[.[] | select(.name | startswith("_") | not) | .name] | .[]' 2>/dev/null)

if [[ -z "$RULES" ]]; then
  echo "Error: Could not fetch rule list for '$SKILL'" >&2
  exit 1
fi

COUNT=0
TOTAL=$(echo "$RULES" | wc -l | tr -d ' ')
FAILED=0

while read -r FILE; do
  COUNT=$((COUNT + 1))
  URL="https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/$SKILL/rules/$FILE"
  if curl -sf --connect-timeout 5 --max-time 15 -z "$CACHE_DIR/$FILE" "$URL" -o "$CACHE_DIR/$FILE"; then
    echo "[$COUNT/$TOTAL] $FILE" >&2
  else
    echo "[$COUNT/$TOTAL] FAILED: $FILE" >&2
    FAILED=$((FAILED + 1))
  fi
done <<< "$RULES"

echo "Synced $((COUNT - FAILED))/$TOTAL rules → $CACHE_DIR" >&2
