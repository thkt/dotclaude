#!/bin/zsh
# ConfigChange hook: log configuration file changes for auditing
# Failure mode: fail-open (config changes must not be blocked)
set +e

LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

INPUT=$(cat)
command -v jq &>/dev/null || exit 0

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
AGENT_INFO=$(printf '%s' "$INPUT" | jq -r '
  if .agent_id then "agent=\(.agent_id)(\(.agent_type // ""))"
  else "main" end' 2>/dev/null || echo "unknown")
printf '%s\t%s\t%s\n' "$TIMESTAMP" "$AGENT_INFO" \
  "$(printf '%s' "$INPUT" | jq -c '.' 2>/dev/null || echo '{}')" \
  >> "$LOG_DIR/config-change.log"

exit 0
