#!/bin/zsh
# Purpose: Determine if codemap update is needed
# Input: None (auto-detected from git diff --cached)
# Output: true/false (stdout), reason (stderr)
set -euo pipefail

result() { echo "$1"; echo "[Codemap] $2" >&2; exit 0; }

git rev-parse --git-dir > /dev/null 2>&1 || result "false" "Not a git repository"

staged=$(git diff --cached --name-only 2>/dev/null || echo "")
[ -z "$staged" ] && result "false" "No staged files"

new_files=$(git diff --cached --name-status 2>/dev/null | grep -c "^A" || echo "0")
entry_points=$(echo "$staged" | grep -cE "(index|main|app|server|layout|page)\.(ts|tsx|js|jsx)$" || echo "0")
deps_changed=$(echo "$staged" | grep -cE "(package\.json|Cargo\.toml|go\.mod|pyproject\.toml)$" || echo "0")

[ "$new_files" -ge 3 ] && result "true" "Update needed: $new_files new files"
[ "$entry_points" -gt 0 ] && result "true" "Update needed: entry point changed"
[ "$deps_changed" -gt 0 ] && result "true" "Update needed: dependency file changed"

result "false" "No update needed"
