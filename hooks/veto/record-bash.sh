#!/usr/bin/env bash
# Fast-exit wrapper for the PostToolUse recorder (bash). Forwards only the two payload shapes the
# recorder may record, gate runs (the veto.py token) and gh issue create (the consumed record), and
# exits without spawning python3 for everything else, so an always-on plugin hook does not pay
# python startup on every Bash call. The precise decision of what to record stays in veto.py
# record bash (any non-matching payload is a silent no-op).
#
# The recorder is best-effort, so unlike the gate this is not fail-closed. A missing python3 or
# an error passes through without a record; stderr goes to record.log for after-the-fact
# root-causing.
input="$(cat)"
case "$input" in
  *veto.py* | *gh*issue*create*) ;;
  *) exit 0 ;;
esac

command -v python3 >/dev/null 2>&1 || exit 0

DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
LOG_DIR="${VETO_HOME:-$HOME/.claude/state/veto}"
# shellcheck disable=SC2174  # -m applying only to the leaf is intended: the leaf IS the store dir
mkdir -p -m 700 "$LOG_DIR" 2>/dev/null || true
printf '%s' "$input" | python3 "$DIR/veto.py" record bash 2>>"$LOG_DIR/record.log" || true
exit 0
