#!/bin/bash
# Rust: run cargo fmt after editing .rs files
f=$(jq -r '.tool_input.file_path, (.tool_input.edits[]?.file_path // empty)' \
  | grep '\.rs$' | head -1)
[ -n "$f" ] || exit 0
root=$(git -C "$(dirname "$f")" rev-parse --show-toplevel 2>/dev/null)
[ -n "$root" ] || exit 0
cd "$root" && cargo fmt 2>/dev/null || true
