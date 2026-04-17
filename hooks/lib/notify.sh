#!/bin/zsh

SOUNDS_DIR="$HOME/.claude/sounds"

play_sound() {
  local file="$SOUNDS_DIR/$1" vol="${2:-0.1}"
  [[ -f "$file" ]] && afplay -volume "$vol" "$file" &
}
