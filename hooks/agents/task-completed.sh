#!/bin/zsh
# TaskCompleted hook: log task completion and play notification
# Failure mode: fail-open
set +e

LOG_FILE="$HOME/.claude/logs/team.log"
SOUND_FILE="$HOME/.claude/sounds/ds_mail.mp3"
mkdir -p "$(dirname "$LOG_FILE")"

INPUT=$(cat)
IFS=$'\t' read -r TASK_ID SUBJECT OWNER AGENT_ID AGENT_TYPE <<< "$(printf '%s' "$INPUT" | jq -r '[(.task_id // "?"), (.task_subject // .subject // "?"), (.owner // "?"), (.agent_id // ""), (.agent_type // "")] | @tsv' 2>/dev/null)"

AGENT_SUFFIX=""
[[ -n "$AGENT_ID" ]] && AGENT_SUFFIX=" agent=$AGENT_ID($AGENT_TYPE)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task completed: #$TASK_ID \"$SUBJECT\" by $OWNER$AGENT_SUFFIX" >> "$LOG_FILE"

if [ -f "$SOUND_FILE" ]; then
    afplay -volume 0.05 "$SOUND_FILE" &
fi

exit 0
