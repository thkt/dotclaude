#!/bin/bash
# PreToolUse hook: Auto-read file before Edit tool execution
# Failure mode: fail-open (skip on error)
# Reference: https://zenn.dev/st_tech/articles/897e52be12232f

set +e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"

[ ! -f "$EXPANDED_PATH" ] && exit 0

SIZE=$(stat -f%z "$EXPANDED_PATH" 2>/dev/null || stat -c%s "$EXPANDED_PATH" 2>/dev/null || echo 0)
[ "$SIZE" -gt 51200 ] && exit 0

cat "$EXPANDED_PATH"
