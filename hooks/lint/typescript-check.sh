#!/bin/bash
# PostToolUse hook: Run tsc --noEmit after editing .ts/.tsx files
# Failure mode: fail-open (report errors but do not block)

set +e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[[ "$FILE_PATH" == *.d.ts ]] && exit 0

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
FILE_DIR=$(dirname "$EXPANDED_PATH")
PROJECT_ROOT=$("${HOME}/.claude/scripts/find-config-root.sh" "$FILE_DIR" "tsconfig.json" 2>/dev/null) || exit 0

command -v npx &> /dev/null || exit 0

cd "$PROJECT_ROOT"
TSC_OUTPUT=$(npx tsc --noEmit 2>&1) || true
ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || echo "0")

[ "$ERROR_COUNT" -eq 0 ] && exit 0

echo ""
echo "⚠ TypeScript: $ERROR_COUNT errors ($(basename "$PROJECT_ROOT"))"
echo "$TSC_OUTPUT" | grep "error TS" | head -5 | sed 's/^/  /'
[ "$ERROR_COUNT" -gt 5 ] && echo "  ... (+$((ERROR_COUNT - 5)) more)"

exit 0
