#!/bin/zsh
# PostToolUse hook: auto-fix .md files with textlint
# Triggered on Write/Edit/MultiEdit for markdown files
set -euo pipefail

TEXTLINT_DIR="$HOME/.claude/hooks/textlint"
TEXTLINT_CONFIG="$TEXTLINT_DIR/.textlintrc.json"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/japanese-detect.sh"

# Read hook JSON from stdin
input=$(cat)

# Fast-exit: skip jq fork unless input references a .md file path
case "$input" in
  *.md\"*) ;;
  *) exit 0 ;;
esac

# printf, not echo: zsh echo expands backslash escapes and corrupts the JSON (\n inside strings)
read -r tool_name file_path < <(printf '%s' "$input" | jq -r '[.tool_name // "", .tool_input.file_path // ""] | @tsv' 2>/dev/null) || true

case "$tool_name" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac
if [[ -z "$file_path" ]]; then
  exit 0
fi

# Only process .md files
case "$file_path" in
  *.md) ;;
  *) exit 0 ;;
esac

# Verify file exists
if [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Skip non-Japanese files
if ! has_japanese < "$file_path"; then
  exit 0
fi

# Verify textlint config exists
if [[ ! -f "$TEXTLINT_CONFIG" ]]; then
  echo "textlint-fix: config not found at $TEXTLINT_CONFIG" >&2
  exit 0
fi

# Determine runtime: bun > npx
# Array, not string: zsh does not word-split "$runner", so "bun x" would run as one command name
if command -v bun &>/dev/null; then
  runner=(bun x)
else
  runner=(npx)
fi

# Run textlint --fix
cd "$TEXTLINT_DIR" || exit 0
"${runner[@]}" textlint --fix --config "$TEXTLINT_CONFIG" "$file_path" >/dev/null 2>&1 || true

exit 0
