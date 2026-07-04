#!/usr/bin/env bash
# PreToolUse gate on `gh issue create`. Fast-exit for anything else. Fail-closed: deny when
# python3 is unavailable or the gate errors. Otherwise `veto.py gate` owns the allow / deny.
#
# The case matcher is intentionally loose: it forwards any Bash payload carrying the gh / issue /
# create tokens, even scattered (file paths, a commit message quoting the phrase). Do NOT tighten
# it to a contiguous phrase to cut false positives -- a real create that the tightened glob missed
# would fast-exit past the gate (a bypass, worse than a false positive). Precise create detection
# lives in veto.py (is_gh_issue_create), which passes a non-create through instead of denying.
input="$(cat)"
case "$input" in
  *'"tool_name":"Bash"'*gh*issue*create*) ;;
  *) exit 0 ;;
esac

DENY='{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"veto: python3 unavailable or gate errored, cannot verify evidence (fail-closed)"}}'
command -v python3 >/dev/null 2>&1 || { printf '%s\n' "$DENY"; exit 0; }

DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
# stderr is kept out of the UI but captured to gate.log so a persistent false-deny (a code bug,
# a store permission error) stays root-causable after the fact. If the log dir cannot be created
# the redirect fails, the command fails, and the generic DENY below keeps it fail-closed.
# -m 700 keeps the store dir owner-only whichever component creates it first (veto.py uses 0o700).
LOG_DIR="${VETO_HOME:-$HOME/.claude/state/veto}"
mkdir -p -m 700 "$LOG_DIR" 2>/dev/null || true
out="$(printf '%s' "$input" | python3 "$DIR/veto.py" gate 2>>"$LOG_DIR/gate.log")" || { printf '%s\n' "$DENY"; exit 0; }
printf '%s' "$out"
exit 0
