#!/bin/bash
# Bash Safety Hook - PreToolUse guard for dangerous commands
# Exit: 0=allow, 2=block. Fail-closed design.
set -euo pipefail

LOG_FILE="$HOME/.claude/logs/bash-safety.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

log_block() {
  printf '[%s] BLOCKED pattern="%s" command="%s"\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$LOG_FILE" 2>/dev/null || \
    echo "WARNING: log write failed" >&2
}

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }

INPUT=$(cat)
[[ -z "$INPUT" ]] && { echo "BLOCKED: empty input" >&2; exit 2; }

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || {
  echo "BLOCKED: invalid JSON" >&2; exit 2
}
[[ -z "$COMMAND" ]] && exit 0

# Normalize: remove quotes for bypass detection (HIGH-1 fix)
NORMALIZED=$(echo "$COMMAND" | sed "s/['\"]//g")

DANGER_PATTERNS=(
  # File deletion (project policy: use mv ~/.Trash/ instead)
  '\brm[[:space:]]+-[[:alnum:]]*r'
  '\brm[[:space:]]+-[[:alnum:]]*f'
  '\brmdir[[:space:]]'
  '\bunlink[[:space:]]'
  # Remote code execution via pipe
  '\bcurl[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b'
  '\bwget[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b'
  '\bcurl[[:space:]].*-o[[:space:]]*-.*\|'
  # Destructive git operations
  '\bgit[[:space:]]+push[[:space:]]+.*--force'
  '\bgit[[:space:]]+push[[:space:]]+(.*-f|-f)([[:space:]]|$)'
  '\bgit[[:space:]]+(checkout|restore)[[:space:]]+(\.|\.[[:space:]]|--[[:space:]]+\.)'
  '\bgit[[:space:]]+clean[[:space:]]+-[[:alnum:]]*[fd]'
  '\bgit[[:space:]]+reset[[:space:]]+--hard'
  '\bgit[[:space:]]+stash[[:space:]]+drop'
)

for pattern in "${DANGER_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern" || echo "$NORMALIZED" | grep -qE "$pattern"; then
    echo "BLOCKED: dangerous command detected" >&2
    log_block "$pattern" "$COMMAND"
    exit 2
  fi
done

exit 0
