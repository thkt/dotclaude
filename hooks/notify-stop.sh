#!/bin/bash
# Stop hook: play different sounds based on context
# - Subagent: silent
# - Main (error): Heavy
# - Main (success): Cleaned

[[ -n "$CLAUDE_CODE_IS_SUBAGENT" ]] && exit 0
command -v jq &>/dev/null || exit 0
source "$HOME/.claude/hooks/lib/notify.sh"

INPUT=$(cat)
STOP_REASON="$(printf '%s' "$INPUT" | jq -r '.stop_reason // "end_turn"' 2>/dev/null)"
STOP_REASON="${STOP_REASON:-end_turn}"

if [[ "$STOP_REASON" != "end_turn" ]]; then
  play_sound "DHVMagellanHorn_Heavy.mp3"
else
  play_sound "DHVMagellanHorn_Cleaned.mp3"
fi
