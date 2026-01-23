#!/bin/bash
# Codemap Auto-Update: generates architecture.md on significant commits
# Triggers: 3+ new files, entry point changes, dependency changes

set -euo pipefail

EXCLUDE_DIRS=(
  node_modules .git dist build __pycache__ target .next coverage
  debug .codemaps file-history cache chrome projects logs
  shell-snapshots golden-masters paste-cache plans plugins ide
  .ja statsig telemetry todos sounds session-env
)

STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
[ -z "$STAGED" ] && exit 0

NEW_FILES=$(git diff --cached --name-status 2>/dev/null | grep "^A" | wc -l | tr -d ' ')
ENTRY_POINT_CHANGE=$(echo "$STAGED" | grep -E "(index|main|app|server|layout|page)\.(ts|tsx|js|jsx)$" | wc -l | tr -d ' ')
DEPS_CHANGE=$(echo "$STAGED" | grep -E "(package\.json|Cargo\.toml|go\.mod|pyproject\.toml)$" | wc -l | tr -d ' ')

SHOULD_UPDATE=false
REASON=""

if [ "$NEW_FILES" -ge 3 ]; then
  SHOULD_UPDATE=true
  REASON="${NEW_FILES} new files"
elif [ "$ENTRY_POINT_CHANGE" -gt 0 ]; then
  SHOULD_UPDATE=true
  REASON="entry point change"
elif [ "$DEPS_CHANGE" -gt 0 ]; then
  SHOULD_UPDATE=true
  REASON="deps change"
fi

[ "$SHOULD_UPDATE" = false ] && exit 0

echo "[Codemap] Updating: $REASON"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CODEMAP_DIR="${PROJECT_ROOT}/.codemaps"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$CODEMAP_DIR"

detect_project_type() {
  local root="${1:-$PROJECT_ROOT}"
  if [ -f "$root/package.json" ]; then echo "node"
  elif [ -f "$root/Cargo.toml" ]; then echo "rust"
  elif [ -f "$root/go.mod" ]; then echo "go"
  elif [ -f "$root/pyproject.toml" ]; then echo "python"
  else echo "unknown"
  fi
}

get_src_dir() {
  local type="$1"
  local root="${2:-$PROJECT_ROOT}"
  if [ -d "$root/src" ]; then echo "src"
  elif [ "$type" = "node" ] && [ -d "$root/app" ]; then echo "app"
  else echo "."
  fi
}

generate_tree() {
  local full_path="${1:-$PROJECT_ROOT}"
  local excludes
  excludes=$(IFS='|'; echo "${EXCLUDE_DIRS[*]}")

  if command -v tree &> /dev/null && [ -d "$full_path" ]; then
    tree -L 3 -I "$excludes" "$full_path" 2>/dev/null || echo "(tree unavailable)"
  else
    local find_excludes=""
    for p in "${EXCLUDE_DIRS[@]}"; do
      find_excludes="$find_excludes -not -path \"*/$p/*\""
    done
    eval "find \"$full_path\" -type f \\( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.py' -o -name '*.rs' -o -name '*.go' \\) $find_excludes 2>/dev/null" | \
      head -30 | sed "s|$PROJECT_ROOT/||" | sort || echo "(no files)"
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

detect_frameworks() {
  local root="${1:-$PROJECT_ROOT}"
  local fw=()
  [ -f "$root/package.json" ] && {
    grep -q '"next"' "$root/package.json" 2>/dev/null && fw+=("Next.js")
    grep -q '"react"' "$root/package.json" 2>/dev/null && fw+=("React")
    grep -q '"vue"' "$root/package.json" 2>/dev/null && fw+=("Vue")
    grep -q '"hono"' "$root/package.json" 2>/dev/null && fw+=("Hono")
  }
  [ ${#fw[@]} -gt 0 ] && printf '%s, ' "${fw[@]}" | sed 's/, $//' || echo "N/A"
}

PROJECT_TYPE=$(detect_project_type)
SRC_DIR=$(get_src_dir "$PROJECT_TYPE")
FRAMEWORKS=$(detect_frameworks)

cat > "$CODEMAP_DIR/architecture.md" << EOF
# Architecture - $(basename "$PROJECT_ROOT")

> Updated: $TIMESTAMP | Type: $PROJECT_TYPE | Frameworks: $FRAMEWORKS

## Structure

\`\`\`text
$(generate_tree "$PROJECT_ROOT/$SRC_DIR")
\`\`\`

## Entry Points

$(find_entry_points "$PROJECT_ROOT/$SRC_DIR" | while read -r e; do [ -n "$e" ] && echo "- \`$e\`"; done)

## Key Exports

\`\`\`text
$(find_key_exports "$PROJECT_ROOT/$SRC_DIR")
\`\`\`
EOF

if command -v prettier &> /dev/null; then
  prettier --write "$CODEMAP_DIR/architecture.md" 2>/dev/null || echo "[Codemap] Warning: prettier formatting failed" >&2
fi

git add "$CODEMAP_DIR/architecture.md" 2>/dev/null || echo "[Codemap] Warning: Failed to stage architecture.md" >&2

echo "[Codemap] Done: $CODEMAP_DIR/architecture.md"
exit 0
