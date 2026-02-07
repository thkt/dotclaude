#!/bin/bash
# EOF newline hook: ensures files end with newline
# Failure mode: fail-open (skip on error)
set +e

command -v jq &>/dev/null || exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
[ ! -f "$EXPANDED_PATH" ] && exit 0

[ -n "$(tail -c1 "$EXPANDED_PATH")" ] && echo >> "$EXPANDED_PATH" 2>/dev/null || echo "warning: cannot append newline to $FILE_PATH" >&2
