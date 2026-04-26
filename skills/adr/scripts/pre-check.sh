#!/bin/zsh
# Usage: pre-check.sh "ADR Title"
# Output (stdout): JSON with number, filename, slug, date, adr_dir, similar_adrs
# Errors (stderr): validation failures with exit 1

set -euo pipefail

TITLE="${1:-}"
if [ -n "${ADR_DIR:-}" ]; then
  : # use provided value
else
  GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
  if [ -z "$GIT_ROOT" ]; then
    echo "Error: not inside a git repository. ADRs require <git-root>/docs/decisions/. Set ADR_DIR env var to override." >&2
    exit 1
  fi
  ADR_DIR="$GIT_ROOT/docs/decisions"
fi
THRESHOLD="${DUPLICATE_THRESHOLD:-0.7}"

TITLE_LENGTH=${#TITLE}
if [ "$TITLE_LENGTH" -lt 5 ] || [ "$TITLE_LENGTH" -gt 64 ]; then
  echo "Error: title length ${TITLE_LENGTH} chars (required 5-64)" >&2
  exit 1
fi

FORBIDDEN_CHARS='[/:*?"<>|]'
if [[ "$TITLE" =~ $FORBIDDEN_CHARS ]]; then
  echo 'Error: forbidden characters in title (/:*?"<>|)' >&2
  exit 1
fi

if [ -d "$ADR_DIR" ] && [ -f "$ADR_DIR/SKILL.md" ]; then
  echo "Error: $ADR_DIR contains SKILL.md (skill-definition directory, not an ADR archive)" >&2
  echo "Set ADR_DIR env var or run from a project root where docs/decisions/ is the archive." >&2
  exit 1
fi

mkdir -p "$ADR_DIR"
if [ ! -w "$ADR_DIR" ]; then
  echo "Error: no write permission: $ADR_DIR" >&2
  exit 1
fi

MAX_NUM=$(ls "$ADR_DIR" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1 || true)
MAX_NUM=${MAX_NUM:-0000}
NEXT_NUM=$(printf "%04d" $((10#$MAX_NUM + 1)))

SLUG=$(echo "$TITLE" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/ /-/g; s/[^a-z0-9-]//g; s/-\{2,\}/-/g; s/^-//; s/-$//')

FILENAME="${NEXT_NUM}-${SLUG}.md"
CURRENT_DATE=$(date +%Y-%m-%d)

# Jaccard word overlap between two titles, printed as "0.00"-"1.00".
similarity() {
  local title_a="$1"
  local title_b="$2"
  local common words
  common=$(comm -12 \
    <(echo "$title_a" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
    <(echo "$title_b" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
    | wc -l | tr -d ' ')
  words=$(echo "$title_a" | tr ' ' '\n' | wc -l | tr -d ' ')
  if [ "$words" -eq 0 ]; then
    echo "0.00"
  else
    awk -v c="$common" -v w="$words" 'BEGIN {printf "%.2f", c/w}'
  fi
}

SIMILAR_JSON="[]"
if [ "$(ls -A "$ADR_DIR" 2>/dev/null)" ]; then
  SIMILAR_ENTRIES=()
  while IFS= read -r existing_file; do
    [ -z "$existing_file" ] && continue
    EXISTING_TITLE=$(grep -m 1 '^# ' "$existing_file" | sed 's/^# //' || true)
    [ -z "$EXISTING_TITLE" ] && continue

    SIM=$(similarity "$TITLE" "$EXISTING_TITLE")
    if awk -v s="$SIM" -v t="$THRESHOLD" 'BEGIN {exit !(s >= t)}'; then
      SAFE_TITLE=${EXISTING_TITLE//\"/\\\"}
      SIMILAR_ENTRIES+=("{\"file\":\"$(basename "$existing_file")\",\"similarity\":\"${SIM}\",\"title\":\"${SAFE_TITLE}\"}")
    fi
  done < <(find "$ADR_DIR" -name "*.md" -type f)

  if [ "${#SIMILAR_ENTRIES[@]}" -gt 0 ]; then
    SIMILAR_JSON="[$(IFS=,; echo "${SIMILAR_ENTRIES[*]}")]"
  fi
fi

cat <<EOF
{
  "status": "ok",
  "number": "${NEXT_NUM}",
  "filename": "${FILENAME}",
  "slug": "${SLUG}",
  "date": "${CURRENT_DATE}",
  "adr_dir": "${ADR_DIR}",
  "similar_adrs": ${SIMILAR_JSON}
}
EOF
