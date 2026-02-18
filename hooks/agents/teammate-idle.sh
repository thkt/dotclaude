#!/bin/zsh
# TeammateIdle hook: log teammate idle events for team activity monitoring
# Failure mode: fail-open
set +e

LOG_FILE="$HOME/.claude/logs/team.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
NAME=$(printf '%s' "$INPUT" | jq -r '.agent_name // .name // "unknown"' 2>/dev/null)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Teammate idle: $NAME" >> "$LOG_FILE"
exit 0
