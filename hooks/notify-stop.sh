#!/bin/bash
# Stop hook: play different sounds based on context
# - Subagent: silent
# - Main (error): Heavy
# - Main (success): Cleaned + activate Ghostty

[[ -n "$CLAUDE_CODE_IS_SUBAGENT" ]] && exit 0

SOUNDS_DIR="$HOME/.claude/sounds"
INPUT=$(cat)
STOP_REASON=$(echo "$INPUT" | jaq -r '.stop_reason // "end_turn"' 2>/dev/null)

if [[ "$STOP_REASON" != "end_turn" ]]; then
  afplay -volume 0.1 "$SOUNDS_DIR/DHVMagellanHorn_Heavy.mp3" &
else
  afplay -volume 0.1 "$SOUNDS_DIR/DHVMagellanHorn_Cleaned.mp3" &
fi

osascript -e 'tell application "Ghostty" to activate'
exit 0
