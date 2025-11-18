#!/bin/bash

# SubagentStart hook script
# Logs subagent start events and plays a notification sound

# Configuration
LOG_FILE="$HOME/.claude/logs/subagent.log"
SOUND_FILE="$HOME/.claude/sounds/ds_mail.mp3"

# Get agent information from environment or stdin
AGENT_NAME="${SUBAGENT_NAME:-unknown}"

# Log the start event
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Subagent started: $AGENT_NAME" >> "$LOG_FILE"

# Play notification sound (very quiet, non-blocking)
if [ -f "$SOUND_FILE" ]; then
    afplay -volume 0.05 "$SOUND_FILE" &
fi

exit 0
