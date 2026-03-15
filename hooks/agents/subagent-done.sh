#!/bin/bash
# Failure mode: fail-open
# Write marker so notify-stop.sh can suppress double-notify
[[ -f "$HOME/.claude/hooks/lib/notify.sh" ]] || exit 0
source "$HOME/.claude/hooks/lib/notify.sh"
touch "$SUBAGENT_DONE_MARKER"
