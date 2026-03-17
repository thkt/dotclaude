#!/bin/zsh
# Failure mode: fail-closed (block on error)
# Exit: 0=allow, 2=block
set -euo pipefail
trap '' PIPE

LOG_FILE="$HOME/.claude/logs/bash-safety.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || echo "WARNING: log dir creation failed" >&2

log_block() {
  local agent_info=""
  [[ -n "${AGENT_ID:-}" ]] && agent_info=" agent=$AGENT_ID($AGENT_TYPE)"
  printf '[%s] BLOCKED pattern="%s" command="%s"%s\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" "$agent_info" >> "$LOG_FILE" 2>/dev/null || \
    echo "WARNING: log write failed" >&2
}

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && { echo "BLOCKED: empty input" >&2; exit 2; }

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || {
  echo "BLOCKED: invalid JSON" >&2; exit 2
}
[[ -z "$COMMAND" ]] && exit 0

# Normalize command to defeat common bypass techniques.
# Scope: strips quotes, $(), $IFS, braces, variable indirection.
# Known limitations (accepted, mitigated by layer 1 deny list):
#   - Backslash escapes (r\m) not stripped
#   - ANSI-C hex/octal ($'\x72\x6d') not decoded
#   - Variable expansion ($X where X=rm) not resolved
normalize_command() {
  local cmd="$1"
  # Strip quotes (single, double, backtick)
  cmd=${cmd//[\'\"\`]/}
  # Strip command substitution
  cmd=${cmd//\$\(/}
  # Strip $IFS expansion (e.g., cmd${IFS}arg → cmd arg)
  cmd=${cmd//\$\{IFS\}/ }
  cmd=${cmd//\$IFS/ }
  # Strip brace expansion (e.g., {rm,-rf,/} → rm -rf /)
  cmd=${cmd//\{/}
  cmd=${cmd//\}/}
  cmd=${cmd//,/ }
  # Strip variable indirection (e.g., ${!var})
  cmd=${cmd//\$\{!/\$\{}
  printf '%s' "$cmd"
}

NORMALIZED=$(normalize_command "$COMMAND")

# Enable PCRE for \b word boundary support
if ! setopt REMATCH_PCRE 2>/dev/null; then
  echo "BLOCKED: zsh lacks PCRE support" >&2
  exit 2
fi

PATTERNS=()
CONTEXTS=()

# File deletion (project policy: use mv ~/.Trash/ instead)
PATTERNS+=('\brm[[:space:]]+-[[:alnum:]]*r')
CONTEXTS+=('Use "mv <file> ~/.Trash/" instead of rm -r.')
PATTERNS+=('\brm[[:space:]]+-[[:alnum:]]*f')
CONTEXTS+=('Use "mv <file> ~/.Trash/" instead of rm -f.')
PATTERNS+=('\brmdir[[:space:]]')
CONTEXTS+=('Use "mv <dir> ~/.Trash/" instead of rmdir.')
PATTERNS+=('\bunlink[[:space:]]')
CONTEXTS+=('Use "mv <file> ~/.Trash/" instead of unlink.')
PATTERNS+=('\bshred[[:space:]]')
CONTEXTS+=('Use "mv <file> ~/.Trash/" instead of shred.')

# Remote code execution via pipe
PATTERNS+=('\bcurl[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b')
CONTEXTS+=('Do not pipe remote content to a shell. Download the file, review it, then execute.')
PATTERNS+=('\bwget[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b')
CONTEXTS+=('Do not pipe remote content to a shell. Download the file, review it, then execute.')
PATTERNS+=('\bcurl[[:space:]].*-o[[:space:]]*-.*\|')
CONTEXTS+=('Do not pipe remote content to a shell. Download the file, review it, then execute.')
# Remote code execution via process substitution
PATTERNS+=('\b(bash|sh|zsh|source|\.)[[:space:]]+<\(')
CONTEXTS+=('Do not execute remote content via process substitution. Download the file, review it, then execute.')

# Destructive git operations
PATTERNS+=('\bgit[[:space:]].*\bpush\b')
CONTEXTS+=('git push is prohibited. Ask the user to push manually or give explicit approval.')
PATTERNS+=('\bgit[[:space:]]+(checkout|restore)[[:space:]]+(\.|\.[[:space:]]|--[[:space:]]+\.)')
CONTEXTS+=('Do not discard all working directory changes. Specify individual files, or ask the user.')
PATTERNS+=('\bgit[[:space:]]+clean[[:space:]]+-[[:alnum:]]*[fd]')
CONTEXTS+=('git clean deletes untracked files irreversibly. Ask the user to execute it.')
PATTERNS+=('\bgit[[:space:]]+reset[[:space:]]+--hard')
CONTEXTS+=('git reset --hard discards uncommitted changes. Ask the user to execute it.')
PATTERNS+=('\bgit[[:space:]]+stash[[:space:]]+(drop|clear)')
CONTEXTS+=('git stash drop/clear is irreversible. Ask the user to manage stashes.')
PATTERNS+=('\bgit[[:space:]]+branch[[:space:]]+-D\b')
CONTEXTS+=('git branch -D force-deletes unmerged branches. Use -d for safe deletion, or ask the user.')

# Indirect deletion via xargs/find
PATTERNS+=('\bxargs[[:space:]].*\b(rm|rmdir|unlink|shred)\b')
CONTEXTS+=('Do not pipe to destructive commands via xargs. List files first, then ask the user.')
PATTERNS+=('\bfind[[:space:]].*-exec[[:space:]].*\b(rm|sh|bash|zsh|python[23]?|perl|ruby|node)\b')
CONTEXTS+=('Do not use find -exec with destructive or execution commands. List files first.')
PATTERNS+=('\bfind[[:space:]].*-delete\b')
CONTEXTS+=('Do not use find -delete. List matching files first, then ask the user to delete.')

# Indirect execution and file modification
PATTERNS+=('\beval[[:space:]]')
CONTEXTS+=('Do not use eval. Write the command directly.')
PATTERNS+=('\bsed[[:space:]].*-i\b')
CONTEXTS+=('Use the Edit tool instead of sed -i for in-place file modification.')
PATTERNS+=('\bsed[[:space:]].*--in-place\b')
CONTEXTS+=('Use the Edit tool instead of sed --in-place for in-place file modification.')
PATTERNS+=('\bawk[[:space:]].*system[[:space:]]*\(')
CONTEXTS+=('Do not use awk system(). Run the command directly via Bash.')

# Download-then-execute
PATTERNS+=('\bcurl[[:space:]].*-o[[:space:]]+/tmp')
CONTEXTS+=('Do not download files to /tmp for execution. Ask the user to review first.')
PATTERNS+=('\bwget[[:space:]].*-O[[:space:]]+/tmp')
CONTEXTS+=('Do not download files to /tmp for execution. Ask the user to review first.')

# Interpreter-based execution bypass
PATTERNS+=('\bpython[23]?[[:space:]]+-c\b')
CONTEXTS+=('Do not use python -c for inline execution. Write a script file instead.')
PATTERNS+=('\bperl[[:space:]]+-e\b')
CONTEXTS+=('Do not use perl -e for inline execution. Write a script file instead.')
PATTERNS+=('\bruby[[:space:]]+-e\b')
CONTEXTS+=('Do not use ruby -e for inline execution. Write a script file instead.')
PATTERNS+=('\bnode[[:space:]]+-e\b')
CONTEXTS+=('Do not use node -e for inline execution. Write a script file instead.')
PATTERNS+=('\bbase64[[:space:]].*\|[[:space:]]*(bash|sh|zsh)\b')
CONTEXTS+=('Do not decode and execute base64-encoded commands.')
PATTERNS+=('\bosascript[[:space:]]')
CONTEXTS+=('osascript can execute arbitrary code. Ask the user to run it manually.')
PATTERNS+=('\bphp[[:space:]]+-r\b')
CONTEXTS+=('Do not use php -r for inline execution. Write a script file instead.')
PATTERNS+=('\bdeno[[:space:]]+(run|eval|repl)\b')
CONTEXTS+=('Do not use deno run/eval for arbitrary execution.')
PATTERNS+=('\bbun[[:space:]]+(run|x|eval)\b')
CONTEXTS+=('Do not use bun run/eval for arbitrary execution. Use the package manager workflow.')

# SQL destructive operations
PATTERNS+=('(?i)\bDROP[[:space:]]+(TABLE|DATABASE)\b')
CONTEXTS+=('DROP TABLE/DATABASE is prohibited. Ask the user to execute destructive SQL.')
PATTERNS+=('(?i)\bTRUNCATE[[:space:]]')
CONTEXTS+=('TRUNCATE is prohibited. Ask the user to execute destructive SQL.')

# GitHub impersonation guard: posting comments/reviews as user
PATTERNS+=('\bgh[[:space:]]+pr[[:space:]]+(comment|review|edit)\b|\bgh[[:space:]]+issue[[:space:]]+comment\b')
CONTEXTS+=('GitHub impersonation guard: this command posts/edits content as the user. Draft the content and show it to the user instead. The user can run the command manually or give explicit approval.')

# Self-test: verify \b word boundary works (fail-closed)
COMBINED_PATTERN="${(j:|:)PATTERNS}"
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
    # Lazy-parse agent metadata (only needed for logging on block path)
    AGENT_ID=$(printf '%s' "$INPUT" | jq -r '.agent_id // ""' 2>/dev/null)
    AGENT_TYPE=$(printf '%s' "$INPUT" | jq -r '.agent_type // ""' 2>/dev/null)
    log_block "$MATCH" "$COMMAND_SINGLE"
    CONTEXT='Blocked by safety policy.'
    for (( i=1; i<=${#PATTERNS[@]}; i++ )); do
      if [[ "$target" =~ ${PATTERNS[$i]} ]]; then
        CONTEXT=${CONTEXTS[$i]}
        break
      fi
    done
    jq -n --arg pattern "$MATCH" --arg ctx "$CONTEXT" \
      '{decision: "block", reason: ("Dangerous pattern: " + $pattern), additionalContext: $ctx}' \
      && exit 0
    # Fallback: fail-closed if jq fails
    echo "BLOCKED: dangerous command detected" >&2
    exit 2
  fi
done

exit 0
