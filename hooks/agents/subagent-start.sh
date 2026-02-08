#!/bin/zsh
# SubagentStart hook: log start event and play notification sound
# Failure mode: fail-open (logging/sound failure should not block agent)
set +e

LOG_FILE="$HOME/.claude/logs/subagent.log"
SOUND_FILE="$HOME/.claude/sounds/ds_mail.mp3"

INPUT=$(cat)
IFS=$'\t' read -r AGENT_ID AGENT_TYPE <<< "$(echo "$INPUT" | jq -r '[(.agent_id // "unknown"), (.agent_type // .subagent_type // "unknown")] | @tsv' 2>/dev/null)"

mkdir -p "$(dirname "$LOG_FILE")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Subagent started: $AGENT_TYPE (id: $AGENT_ID)" >> "$LOG_FILE"

if [ -f "$SOUND_FILE" ]; then
    afplay -volume 0.05 "$SOUND_FILE" &
fi

exit 0
