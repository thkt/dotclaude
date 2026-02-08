#!/bin/bash
# Bash Safety Hook - PreToolUse guard for dangerous commands
# Failure mode: fail-closed (block on error)
# Exit: 0=allow, 2=block
set -euo pipefail

LOG_FILE="$HOME/.claude/logs/bash-safety.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

log_block() {
  printf '[%s] BLOCKED pattern="%s" command="%s"\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$LOG_FILE" 2>/dev/null || \
    echo "WARNING: log write failed" >&2
}

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && { echo "BLOCKED: empty input" >&2; exit 2; }

COMMAND=$(jq -r '.tool_input.command // ""' <<< "$INPUT" 2>/dev/null) || {
  echo "BLOCKED: invalid JSON" >&2; exit 2
}
[[ -z "$COMMAND" ]] && exit 0

# Strip quotes to prevent bypass via quoting
NORMALIZED=${COMMAND//[\'\"]/}

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
COMMAND_SINGLE=${COMMAND//$'\n'/ }
NORMALIZED_SINGLE=${NORMALIZED//$'\n'/ }

# Combine patterns into single regex for bash builtin matching
COMBINED_PATTERN=$(IFS='|'; echo "${DANGER_PATTERNS[*]}")
for target in "$COMMAND_SINGLE" "$NORMALIZED_SINGLE"; do
  if [[ "$target" =~ $COMBINED_PATTERN ]]; then
    echo "BLOCKED: dangerous command detected" >&2
    log_block "${BASH_REMATCH[0]}" "$COMMAND"
    exit 2
  fi
done

exit 0
