#!/bin/zsh
# Failure mode: fail-closed (block on error)
# Exit: 0=allow, 2=block
set -euo pipefail

LOG_FILE="$HOME/.claude/logs/bash-safety.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || echo "WARNING: log dir creation failed" >&2

log_block() {
  printf '[%s] BLOCKED pattern="%s" command="%s"\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$LOG_FILE" 2>/dev/null || \
    echo "WARNING: log write failed" >&2
}

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && { echo "BLOCKED: empty input" >&2; exit 2; }

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || {
  echo "BLOCKED: invalid JSON" >&2; exit 2
}
[[ -z "$COMMAND" ]] && exit 0

# Strip quotes to prevent bypass via quoting
NORMALIZED=${COMMAND//[\'\"\`]/}
NORMALIZED=${NORMALIZED//\$\(/}
# Strip $IFS expansion (e.g., cmd${IFS}arg → cmd arg)
NORMALIZED=${NORMALIZED//\$\{IFS\}/ }
NORMALIZED=${NORMALIZED//\$IFS/ }
# Strip brace expansion (e.g., {rm,-rf,/} → rm -rf /)
NORMALIZED=${NORMALIZED//\{/}
NORMALIZED=${NORMALIZED//\}/}
NORMALIZED=${NORMALIZED//,/ }
# Strip variable indirection (e.g., ${!var})
NORMALIZED=${NORMALIZED//\$\{!/\$\{}

# Enable PCRE for \b word boundary support
if ! setopt REMATCH_PCRE 2>/dev/null; then
  echo "BLOCKED: zsh lacks PCRE support" >&2
  exit 2
fi

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
  # Interpreter-based execution bypass
  '\bpython[23]?[[:space:]]+-c\b'
  '\bperl[[:space:]]+-e\b'
  '\bruby[[:space:]]+-e\b'
  '\bnode[[:space:]]+-e\b'
  '\bbase64[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b'
)

# Self-test: verify \b word boundary works (fail-closed)
COMBINED_PATTERN="${(j:|:)DANGER_PATTERNS}"
if ! [[ "rm -rf" =~ $COMBINED_PATTERN ]]; then
  echo "BLOCKED: regex engine lacks \\b support" >&2
  exit 2
fi

# Self-test: \b must not match substrings (fail-closed)
if [[ "firmware update" =~ $COMBINED_PATTERN ]]; then
  echo "BLOCKED: regex word boundary false positive detected" >&2
  exit 2
fi

COMMAND_SINGLE=${COMMAND//$'\n'/ }
NORMALIZED_SINGLE=${NORMALIZED//$'\n'/ }

for target in "$COMMAND_SINGLE" "$NORMALIZED_SINGLE"; do
  if [[ "$target" =~ $COMBINED_PATTERN ]]; then
    echo "BLOCKED: dangerous command detected" >&2
    log_block "$MATCH" "$COMMAND"
    exit 2
  fi
done

exit 0
