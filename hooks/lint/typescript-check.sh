#!/bin/zsh
# Failure mode: fail-open (report errors but do not block)

set +e

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[[ "$FILE_PATH" == *.d.ts ]] && exit 0

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
FILE_DIR=$(dirname "$EXPANDED_PATH")
[ -x "${HOME}/.claude/scripts/find-config-root.sh" ] || { echo "⚠ find-config-root.sh not found, skipping tsc" >&2; exit 0; }
PROJECT_ROOT=$("${HOME}/.claude/scripts/find-config-root.sh" "$FILE_DIR" "tsconfig.json" 2>/dev/null) || exit 0

TSC_BIN="$PROJECT_ROOT/node_modules/.bin/tsc"
[ -x "$TSC_BIN" ] || exit 0

cd "$PROJECT_ROOT"
TSC_OUTPUT=$("$TSC_BIN" --noEmit 2>&1)
TSC_EXIT=$?
ERROR_COUNT=$(printf '%s\n' "$TSC_OUTPUT" | grep -c "error TS" || echo "0")

if [ "$TSC_EXIT" -ne 0 ] && [ "$ERROR_COUNT" -eq 0 ]; then
  echo "⚠ tsc failed to run (exit $TSC_EXIT): $(printf '%s\n' "$TSC_OUTPUT" | head -1)" >&2
  exit 0
fi

[ "$ERROR_COUNT" -eq 0 ] && exit 0

echo ""
echo "⚠ TypeScript: $ERROR_COUNT errors ($(basename "$PROJECT_ROOT"))"
printf '%s\n' "$TSC_OUTPUT" | grep "error TS" | head -5 | sed 's/^/  /'
[ "$ERROR_COUNT" -gt 5 ] && echo "  ... (+$((ERROR_COUNT - 5)) more)"

exit 0
