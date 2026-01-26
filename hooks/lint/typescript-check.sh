#!/bin/bash
# PostToolUse hook: Run tsc --noEmit after editing .ts/.tsx files (non-blocking)

set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[[ "$FILE_PATH" == *.d.ts ]] && exit 0

find_project_root() {
  "${HOME}/.claude/scripts/find-config-root.sh" "$1" "tsconfig.json"
}

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
FILE_DIR=$(dirname "$EXPANDED_PATH")
PROJECT_ROOT=$(find_project_root "$FILE_DIR" 2>/dev/null) || exit 0

command -v npx &> /dev/null || exit 0

cd "$PROJECT_ROOT"
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || true
ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")

[ "$ERROR_COUNT" -eq 0 ] && exit 0
cat << EOF

┌─────────────────────────────────────────────────┐
│  ⚠️  TypeScript errors detected                 │
├─────────────────────────────────────────────────┤
│  Errors: $(printf "%-40s" "$ERROR_COUNT")│
│  Project: $(printf "%-38s" "$(basename "$PROJECT_ROOT")")│
├─────────────────────────────────────────────────┤
$(echo "$TSC_OUTPUT" | grep "error TS" | head -5 | while IFS= read -r line || [[ -n "$line" ]]; do
  truncated="${line:0:47}"
  printf "│  %-47s│\n" "$truncated"
done)
│  ...                                            │
└─────────────────────────────────────────────────┘

EOF

exit 0
