#!/bin/zsh
# WorktreeCreate/WorktreeRemove hook: log worktree lifecycle events
# Failure mode: fail-open (worktree operations must not be blocked)
set +e

LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

INPUT=$(cat)
command -v jq &>/dev/null || exit 0

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // "unknown"' 2>/dev/null)

printf '%s\t%s\t%s\n' "$TIMESTAMP" "$EVENT" \
  "$(printf '%s' "$INPUT" | jq -c '.' 2>/dev/null || echo '{}')" \
  >> "$LOG_DIR/worktree.log"

exit 0
