#!/bin/bash
# Stop hook: play different sounds based on context
# - Subagent: silent
# - Main (error): Heavy
# - Main (success): Cleaned + activate Ghostty

[[ -n "$CLAUDE_CODE_IS_SUBAGENT" ]] && exit 0

SOUNDS_DIR="$HOME/.claude/sounds"
INPUT=$(cat)
STOP_REASON=$(printf '%s' "$INPUT" | jq -r '.stop_reason // "end_turn"' 2>/dev/null)
STOP_REASON="${STOP_REASON:-end_turn}"
PROJECT_DIR=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null)

if [[ "$STOP_REASON" != "end_turn" ]]; then
  [[ -f "$SOUNDS_DIR/DHVMagellanHorn_Heavy.mp3" ]] && afplay -volume 0.1 "$SOUNDS_DIR/DHVMagellanHorn_Heavy.mp3" &
else
  [[ -f "$SOUNDS_DIR/DHVMagellanHorn_Cleaned.mp3" ]] && afplay -volume 0.1 "$SOUNDS_DIR/DHVMagellanHorn_Cleaned.mp3" &
fi

SUBAGENT_FLAG="${TMPDIR:-/tmp}/claude-subagent-completed"
if mv "$SUBAGENT_FLAG" "${SUBAGENT_FLAG}.$$" 2>/dev/null; then
  trap 'rm -f "${SUBAGENT_FLAG}.$$"' EXIT
  FLAG_MTIME=$(stat -f %m "${SUBAGENT_FLAG}.$$" 2>/dev/null)
  rm -f "${SUBAGENT_FLAG}.$$"
  FLAG_AGE=$(( $(date +%s) - ${FLAG_MTIME:-0} ))
  # Subagent completion within 30s → skip Ghostty focus (subagent hook already notified)
  (( FLAG_AGE < 30 )) && exit 0
fi

osascript - "${PROJECT_DIR:-$PWD}" <<'APPLESCRIPT' &
on run argv
  set targetDir to item 1 of argv
  tell application "System Events"
    if not (exists process "Ghostty") then return
  end tell
  tell application "Ghostty"
    activate
    set matched to every terminal whose working directory is targetDir
    if (count of matched) > 0 then
      focus (item 1 of matched)
    end if
  end tell
end run
APPLESCRIPT
exit 0
