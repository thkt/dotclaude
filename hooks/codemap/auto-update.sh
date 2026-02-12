#!/bin/zsh
# Failure mode: fail-open (skip update on error)
set +e

EXCLUDE_DIRS=(
  node_modules .git dist build __pycache__ target .next coverage
  debug .analysis file-history cache chrome projects logs
  shell-snapshots golden-masters paste-cache plans plugins ide
  .ja statsig telemetry todos tasks sounds session-env
)

SHOULD_UPDATE_SCRIPT="${HOME}/.claude/scripts/should-update-codemap.sh"
[ -x "$SHOULD_UPDATE_SCRIPT" ] || exit 0

STDERR_TMP=$(mktemp) || exit 0
trap 'rm -f "$STDERR_TMP"' EXIT
RESULT=$("$SHOULD_UPDATE_SCRIPT" 2>"$STDERR_TMP") || exit 0
REASON=$(cat "$STDERR_TMP")

[ "$RESULT" = "false" ] && exit 0

[ -n "$REASON" ] && echo "$REASON"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CODEMAP_DIR="${PROJECT_ROOT}/.analysis"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$CODEMAP_DIR"

SCRIPTS_DIR="${HOME}/.claude/scripts"

generate_tree() {
  local full_path="${1:-$PROJECT_ROOT}"
  local excludes
  excludes="${(j:|:)EXCLUDE_DIRS}"

  if command -v tree &> /dev/null && [ -d "$full_path" ]; then
    tree -L 3 -I "$excludes" "$full_path" 2>/dev/null || echo "(tree unavailable)"
  else
    local find_args=("$full_path" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.rs' -o -name '*.go' \))
    for p in "${EXCLUDE_DIRS[@]}"; do
      find_args+=(-not -path "*/$p/*")
    done
    local output
    output=$(find "${find_args[@]}" 2>/dev/null | head -30 | sed "s|$PROJECT_ROOT/||" | sort)
    echo "${output:-(no files)}"
  fi
}

find_entry_points() {
  local full_path="${1:-$PROJECT_ROOT}"
  for p in index.ts index.tsx index.js main.ts main.js app.ts app.tsx server.ts layout.tsx page.tsx; do
    find "$full_path" -maxdepth 3 -name "$p" -print 2>/dev/null
  done | sed "s|$PROJECT_ROOT/||" | sort -u | head -10
}

find_key_exports() {
  local full_path="${1:-$PROJECT_ROOT}"
  grep -rh "^export \(default \)\?\(function\|const\|class\|interface\|type\)" "$full_path" 2>/dev/null | \
    sed 's/export default /export /; s/export //' | \
    cut -d'(' -f1 | cut -d'=' -f1 | cut -d'{' -f1 | \
    awk '{print $1, $2}' | sort -u | head -20 || echo "(none)"
}

PROJECT_TYPE=$("$SCRIPTS_DIR/detect-project-type.sh" "$PROJECT_ROOT") || PROJECT_TYPE="unknown"
[ -z "$PROJECT_TYPE" ] && PROJECT_TYPE="unknown"
SRC_DIR=$("$SCRIPTS_DIR/get-src-dir.sh" "$PROJECT_TYPE" "$PROJECT_ROOT") || SRC_DIR=""
FRAMEWORKS=$("$SCRIPTS_DIR/detect-frameworks.sh" "$PROJECT_ROOT") || FRAMEWORKS="N/A"

TREE_OUTPUT=$(generate_tree "$PROJECT_ROOT/$SRC_DIR")
ENTRY_POINTS=$(find_entry_points "$PROJECT_ROOT/$SRC_DIR")
ENTRY_POINTS_MD=$(echo "$ENTRY_POINTS" | while read -r e; do [ -n "$e" ] && echo "- \`$e\`"; done)
KEY_EXPORTS=$(find_key_exports "$PROJECT_ROOT/$SRC_DIR")

emit_markdown() {
  cat > "$CODEMAP_DIR/architecture.md" << EOF
# Architecture - $(basename "$PROJECT_ROOT")

> Updated: $TIMESTAMP | Type: $PROJECT_TYPE | Frameworks: $FRAMEWORKS

## Structure

\`\`\`text
$TREE_OUTPUT
\`\`\`

## Entry Points

$ENTRY_POINTS_MD

## Key Exports

\`\`\`text
$KEY_EXPORTS
\`\`\`
EOF
}

emit_yaml() {
  local fw_yaml
  fw_yaml=$(echo "$FRAMEWORKS" | tr ',' '\n' | sed 's/^ *//' | while read -r fw; do
    [ -n "$fw" ] && [ "$fw" != "N/A" ] && printf '  - "%s"\n' "$fw"
  done)

  local entry_yaml
  entry_yaml=$(echo "$ENTRY_POINTS" | while read -r e; do
    [ -n "$e" ] && printf '  - "%s"\n' "$e"
  done)

  local export_yaml
  export_yaml=$(echo "$KEY_EXPORTS" | while read -r e; do
    [ -n "$e" ] && printf '  - "%s"\n' "$e"
  done)

  # Sanitize values for YAML safety
  local safe_name safe_type
  safe_name=$(basename "$PROJECT_ROOT" | tr -d '"\\')
  safe_type=$(printf '%s' "$PROJECT_TYPE" | tr -d '"\\')

  {
    printf 'project_name: "%s"\n' "$safe_name"
    printf 'updated: "%s"\n' "$TIMESTAMP"
    printf 'source: hook\n'
    printf 'project_type: "%s"\n' "$safe_type"
    printf 'frameworks:\n'
    if [ -n "$fw_yaml" ]; then
      printf '%s\n' "$fw_yaml"
    else
      printf '  []\n'
    fi
    printf 'entry_points:\n'
    if [ -n "$entry_yaml" ]; then
      printf '%s\n' "$entry_yaml"
    else
      printf '  []\n'
    fi
    printf 'key_exports:\n'
    if [ -n "$export_yaml" ]; then
      printf '%s\n' "$export_yaml"
    else
      printf '  []\n'
    fi
  } > "$CODEMAP_DIR/architecture.yaml"
}

emit_markdown
emit_yaml

if command -v prettier &> /dev/null; then
  prettier --write "$CODEMAP_DIR/architecture.md" 2>/dev/null || echo "[Codemap] Warning: prettier formatting failed" >&2
fi

git add "$CODEMAP_DIR/architecture.md" "$CODEMAP_DIR/architecture.yaml" 2>/dev/null || echo "[Codemap] Warning: Failed to stage codemap files" >&2

echo "[Codemap] Done: $CODEMAP_DIR/architecture.{md,yaml}"
exit 0
