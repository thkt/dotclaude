#!/bin/zsh
# EOF newline hook: ensures files end with newline
# Failure mode: fail-open (skip on error)
set +e

command -v jq &>/dev/null || exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
EXPANDED_PATH="${EXPANDED_PATH:a}"
[ ! -f "$EXPANDED_PATH" ] && exit 0

if [ -n "$(tail -c1 "$EXPANDED_PATH")" ]; then
  echo >> "$EXPANDED_PATH" 2>/dev/null || echo "warning: cannot append newline to $FILE_PATH" >&2
fi
