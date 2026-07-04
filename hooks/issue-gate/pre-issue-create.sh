#!/usr/bin/env bash
# PreToolUse gate on `gh issue create`. Fast-exit for anything else. Fail-closed: deny when node
# is unavailable or gate-check errors. Otherwise gate-check.mjs owns the allow / deny decision.
input="$(cat)"
case "$input" in
  *'"tool_name":"Bash"'*gh*issue*create*) ;;
  *) exit 0 ;;
esac

DENY_NODE='{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"issue-gate: node unavailable or gate errored, cannot verify evidence (fail-closed)"}}'
command -v node >/dev/null 2>&1 || { printf '%s\n' "$DENY_NODE"; exit 0; }

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$(printf '%s' "$input" | node "$DIR/gate-check.mjs" 2>/dev/null)" || { printf '%s\n' "$DENY_NODE"; exit 0; }
printf '%s' "$out"
exit 0
