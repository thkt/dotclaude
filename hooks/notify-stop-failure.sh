#!/bin/bash
# StopFailure hook: notify when turn ends due to API error
# (rate limit, auth failure, etc.)

command -v jq &>/dev/null || exit 0
source "$HOME/.claude/hooks/lib/notify.sh"

INPUT=$(cat)
STOP_REASON=$(printf '%s' "$INPUT" | jq -r '.stop_reason // "unknown"' 2>/dev/null)

play_sound "DHVMagellanHorn_Heavy.mp3"

osascript -e "display notification \"$STOP_REASON\" with title \"Claude Code\" subtitle \"API Error\"" &
exit 0
