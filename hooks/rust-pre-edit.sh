#!/bin/bash
# Rust: run cargo clippy before editing .rs files
# Outputs lint errors as additionalContext so Claude can fix them during the edit.
f=$(jq -r '.tool_input.file_path, (.tool_input.edits[]?.file_path // empty)' \
  | grep '\.rs$' | head -1)
[ -n "$f" ] || exit 0
root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] || exit 0
cd "$root" && cargo clippy --color never 2>&1 | head -40 \
  | jq -Rs '{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": .}}'
