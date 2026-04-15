#!/bin/zsh
set +e

# Failure mode: fail-open (advisory only, never blocks)

INPUT=$(</dev/stdin)
SESSION_ID=$(printf '%s' "$INPUT" | jq -r '.session_id // ""' 2>/dev/null)

# Find bridge file written by statusline.sh
CTX_FILE="${TMPDIR:-/tmp}/claude-ctx-${SESSION_ID}.json"
if [ -z "$SESSION_ID" ] || [ ! -f "$CTX_FILE" ]; then
    CTX_FILE=$(ls -t "${TMPDIR:-/tmp}"/claude-ctx-*.json 2>/dev/null | head -1)
    [ -f "$CTX_FILE" ] || exit 0
fi

REMAINING=$(jq -r '.remaining_pct // 100' "$CTX_FILE" 2>/dev/null)
[[ "$REMAINING" =~ ^[0-9]+$ ]] || exit 0
[ "$REMAINING" -ge 30 ] && exit 0

# Cooldown: warn only when remaining_pct drops 5+ points since last warning
WARN_FILE="${TMPDIR:-/tmp}/claude-ctx-warned-${SESSION_ID:-default}.txt"
LAST_WARNED=100
[ -f "$WARN_FILE" ] && read -r LAST_WARNED < "$WARN_FILE" 2>/dev/null
[[ "$LAST_WARNED" =~ ^[0-9]+$ ]] || LAST_WARNED=100
[ "$REMAINING" -ge $((LAST_WARNED - 5)) ] && exit 0

printf '%d\n' "$REMAINING" > "$WARN_FILE"
printf '⚠️ Context残り%d%% — /delta で発見を記録してから /compact を実行してな\n' "$REMAINING"
