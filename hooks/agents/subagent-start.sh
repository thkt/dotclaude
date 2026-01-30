#!/bin/bash
set -euo pipefail

# SubagentStart hook script
# Logs subagent start events and plays a notification sound
# Input: JSON via stdin with fields: agent_id, agent_type/subagent_type, etc.

# Configuration
LOG_FILE="$HOME/.claude/logs/subagent.log"
SOUND_FILE="$HOME/.claude/sounds/ds_mail.mp3"

# Read JSON input from stdin
INPUT=$(cat)

# Extract agent information from JSON
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // .subagent_type // "unknown"')

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Log the start event
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Subagent started: $AGENT_TYPE (id: $AGENT_ID)" >> "$LOG_FILE"

# Play notification sound (very quiet, non-blocking)
if [ -f "$SOUND_FILE" ]; then
    afplay -volume 0.05 "$SOUND_FILE" &
fi

exit 0
