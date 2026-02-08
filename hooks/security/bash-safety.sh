#!/bin/bash
# Bash Safety Hook - PreToolUse guard for dangerous commands
# Failure mode: fail-closed (block on error)
# Exit: 0=allow, 2=block
set -euo pipefail

LOG_FILE="$HOME/.claude/logs/bash-safety.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
[[ -d "$(dirname "$LOG_FILE")" ]] || echo "WARNING: audit log dir unavailable" >&2

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

# Strip quotes to prevent bypass via quoting
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
  # Indirect deletion via xargs/find
  '\bxargs[[:space:]].*\b(rm|rmdir|unlink|shred)\b'
  '\bfind[[:space:]].*-exec[[:space:]].*\brm\b'
  '\bfind[[:space:]].*-delete\b'
  # Indirect execution and file modification
  '\beval[[:space:]]'
  '\bsed[[:space:]].*-i\b'
  '\bsed[[:space:]].*--in-place\b'
  '\bawk[[:space:]].*system\s*\('
  # Download-then-execute
  '\bcurl[[:space:]].*-o[[:space:]]+/tmp'
  '\bwget[[:space:]].*-O[[:space:]]+/tmp'
)

# Collapse newlines to prevent multiline bypass
COMMAND_SINGLE=$(printf '%s' "$COMMAND" | tr '\n' ' ')
NORMALIZED_SINGLE=$(printf '%s' "$NORMALIZED" | tr '\n' ' ')

for pattern in "${DANGER_PATTERNS[@]}"; do
  if printf '%s' "$COMMAND_SINGLE" | grep -qE "$pattern" || printf '%s' "$NORMALIZED_SINGLE" | grep -qE "$pattern"; then
    echo "BLOCKED: dangerous command detected" >&2
    log_block "$pattern" "$COMMAND"
    exit 2
  fi
done

exit 0
