#!/usr/bin/env bash

SOUNDS_DIR="$HOME/.claude/sounds"
SUBAGENT_DONE_MARKER="${TMPDIR:-/tmp}/claude-subagent-completed"

play_sound() {
  local file="$SOUNDS_DIR/$1" vol="${2:-0.1}"
  [[ -f "$file" ]] && afplay -volume "$vol" "$file" &
}
