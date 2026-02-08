#!/bin/zsh
# Failure mode: fail-open (formatting errors do not block the tool)
set +e

command -v jq &>/dev/null || exit 0

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ -z "$FILE_PATH" ] && exit 0
[ ! -f "$FILE_PATH" ] && exit 0

EXT="${FILE_PATH##*.}"

case "$EXT" in
  ts|tsx|js|jsx|json|css|scss|md|yaml|yml) ;;
  *) exit 0 ;;
esac

EXPANDED_PATH="${FILE_PATH/#\~/$HOME}"
EXPANDED_PATH="${EXPANDED_PATH:a}"
FILE_DIR=$(dirname "$EXPANDED_PATH")

FIND_CONFIG="${HOME}/.claude/scripts/find-config-root.sh"
[ -x "$FIND_CONFIG" ] || exit 0

run_fmt() {
  local name="$1"
  local root="$2"
  shift 2
  if [ -n "$root" ] && [ -x "$root/node_modules/.bin/$name" ]; then
    "$root/node_modules/.bin/$name" "$@" 2>&1 || echo "$name failed: $FILE_PATH" >&2
  fi
}

BIOME_ROOT=$("$FIND_CONFIG" "$FILE_DIR" "biome.json" "biome.jsonc" 2>/dev/null) || BIOME_ROOT=""
PRETTIER_ROOT=$("$FIND_CONFIG" "$FILE_DIR" \
  ".prettierrc" ".prettierrc.json" ".prettierrc.yaml" ".prettierrc.yml" \
  ".prettierrc.js" ".prettierrc.cjs" "prettier.config.js" "prettier.config.cjs" 2>/dev/null) || PRETTIER_ROOT=""

case "$EXT" in
  ts|tsx|js|jsx|json|css) BIOME_SUPPORTED=1 ;;
  *) BIOME_SUPPORTED=0 ;;
esac

if [ -n "$BIOME_ROOT" ] && [ "$BIOME_SUPPORTED" -eq 1 ]; then
  run_fmt "biome" "$BIOME_ROOT" format --write "$FILE_PATH"
elif [ -n "$PRETTIER_ROOT" ]; then
  run_fmt "prettier" "$PRETTIER_ROOT" --write "$FILE_PATH"
fi

exit 0
