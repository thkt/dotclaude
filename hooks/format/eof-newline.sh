#!/bin/bash
# EOF newline hook: ensures files end with newline
# Failure mode: fail-open (skip on error)
set +e

command -v jq &>/dev/null || exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

[ -n "$(tail -c1 "$FILE_PATH")" ] && echo >> "$FILE_PATH"
