#!/bin/bash
# SubagentStop hook: auto-save subagent execution logs
# Failure mode: fail-open (log save failure should not block)
# Uses agent_id and agent_transcript_path fields (v2.0.42+)
set +e

LOG_DIR="$HOME/.claude/logs/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

INPUT=$(cat)
IFS=$'\t' read -r AGENT_ID TRANSCRIPT_PATH <<< "$(echo "$INPUT" | jq -r '[(.agent_id // "unknown"), (.agent_transcript_path // "")] | @tsv' 2>/dev/null)"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  AGENT_LOG_DIR="$LOG_DIR/$AGENT_ID"
  mkdir -p -m 700 "$AGENT_LOG_DIR"

  LOG_FILE="$AGENT_LOG_DIR/transcript-${TIMESTAMP}.json"
  cp "$TRANSCRIPT_PATH" "$LOG_FILE"
  chmod 600 "$LOG_FILE"
  ln -sf "$LOG_FILE" "$AGENT_LOG_DIR/latest.json"

  find "$AGENT_LOG_DIR" -name "transcript-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true

  LINE_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
  echo "✓ Agent log saved: $AGENT_ID (${LINE_COUNT} lines)"
else
  echo "⚠ Agent transcript not found: $AGENT_ID" >&2
fi

exit 0
