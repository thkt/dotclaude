#!/bin/bash
# Stop hook: play different sounds based on context
# - Subagent: silent
# - Main after subagent: silent (flag-based, 30s window)
# - Main (error): Heavy
# - Main (success): Cleaned + activate Ghostty pane

[[ -n "$CLAUDE_CODE_IS_SUBAGENT" ]] && exit 0
command -v jq &>/dev/null || exit 0
source "$HOME/.claude/hooks/lib/notify.sh"

INPUT=$(cat)
IFS=$'\t' read -r STOP_REASON PROJECT_DIR <<< "$(printf '%s' "$INPUT" | jq -r '[(.stop_reason // "end_turn"), (.cwd // "")] | @tsv' 2>/dev/null)"
STOP_REASON="${STOP_REASON:-end_turn}"
PROJECT_DIR="${PROJECT_DIR:-$PWD}"

# Avoid double-notify when main agent resumes right after subagent
if mv "$SUBAGENT_DONE_MARKER" "${SUBAGENT_DONE_MARKER}.$$" 2>/dev/null; then
  FLAG_MTIME=$(stat -f %m "${SUBAGENT_DONE_MARKER}.$$" 2>/dev/null) || { rm -f "${SUBAGENT_DONE_MARKER}.$$"; exit 0; }
  rm -f "${SUBAGENT_DONE_MARKER}.$$"
  (( $(date +%s) - FLAG_MTIME < 30 )) && exit 0
fi

if [[ "$STOP_REASON" != "end_turn" ]]; then
  play_sound "DHVMagellanHorn_Heavy.mp3"
else
  play_sound "DHVMagellanHorn_Cleaned.mp3"
fi

# Skip Ghostty focus if user is actively interacting (typing, scrolling, etc.)
IDLE_NS=$(ioreg -c IOHIDSystem 2>/dev/null | awk '/HIDIdleTime/ {print $NF; exit}')
[[ -n "$IDLE_NS" ]] && (( IDLE_NS < 3000000000 )) && exit 0  # 3s in ns

osascript - "$PROJECT_DIR" <<'APPLESCRIPT' &
on run argv
  set targetDir to item 1 of argv
  tell application "System Events"
    if not (exists process "Ghostty") then return
  end tell
  tell application "Ghostty"
    activate
    repeat with w in every window
      repeat with t in (every tab of w)
        set matched to every terminal of t whose working directory is targetDir
        if (count of matched) > 0 then
          select tab t
          focus (item 1 of matched)
          return
        end if
      end repeat
    end repeat
  end tell
end run
APPLESCRIPT
exit 0
