#!/bin/zsh
# TeammateIdle hook: log teammate idle events for team activity monitoring
# Failure mode: fail-open
set +e

LOG_FILE="$HOME/.claude/logs/team.log"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
IFS=$'\t' read -r NAME AGENT_ID AGENT_TYPE <<< "$(printf '%s' "$INPUT" | jq -r '[(.agent_name // .name // "unknown"), (.agent_id // ""), (.agent_type // "")] | @tsv' 2>/dev/null)"

AGENT_SUFFIX=""
[[ -n "$AGENT_ID" ]] && AGENT_SUFFIX=" id=$AGENT_ID($AGENT_TYPE)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Teammate idle: $NAME$AGENT_SUFFIX" >> "$LOG_FILE"
exit 0
