#!/usr/bin/env bash
# PreToolUse guard: refuse edits to the issue-gate audit store through the Edit / Write /
# MultiEdit tools, so evidence records cannot be forged or erased with a file edit.
# Residual: a Bash `>>` append still reaches the store; that bypass is out of scope here
# (same class as the gh-api POST bypass) and is documented in the cutover notes.
input="$(cat)"
case "$input" in
  *state/issue-gate/audit.jsonl*)
    printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"issue-gate: the audit store is append-only via the recorders; direct edits are refused"}}'
    exit 0
    ;;
esac
exit 0
