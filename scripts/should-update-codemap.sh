#!/bin/bash
# Purpose: Determine if codemap update is needed
# Input: None (auto-detected from git diff --cached)
# Output: true/false (stdout), reason (stderr)
set -euo pipefail

# If outside git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "false"
  echo "[Codemap] Not a git repository" >&2
  exit 0
fi

staged=$(git diff --cached --name-only 2>/dev/null || echo "")

if [ -z "$staged" ]; then
  echo "false"
  echo "[Codemap] No staged files" >&2
  exit 0
fi

new_files=$(git diff --cached --name-status 2>/dev/null | grep -c "^A" || echo "0")
entry_points=$(echo "$staged" | grep -cE "(index|main|app|server|layout|page)\.(ts|tsx|js|jsx)$" || echo "0")
deps_changed=$(echo "$staged" | grep -cE "(package\.json|Cargo\.toml|go\.mod|pyproject\.toml)$" || echo "0")

if [ "$new_files" -ge 3 ]; then
  echo "true"
  echo "[Codemap] Update needed: $new_files new files" >&2
  exit 0
fi

if [ "$entry_points" -gt 0 ]; then
  echo "true"
  echo "[Codemap] Update needed: entry point changed" >&2
  exit 0
fi

if [ "$deps_changed" -gt 0 ]; then
  echo "true"
  echo "[Codemap] Update needed: dependency file changed" >&2
  exit 0
fi

echo "false"
echo "[Codemap] No update needed" >&2
