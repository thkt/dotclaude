#!/bin/zsh
# Failure mode: fail-open (log save failure should not block)
# Requires agent_id + agent_transcript_path fields (v2.0.42+)
set +e

LOG_DIR="$HOME/.claude/logs/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

INPUT=$(cat)
IFS=$'\t' read -r AGENT_ID TRANSCRIPT_PATH <<< "$(printf '%s' "$INPUT" | jq -r '[(.agent_id // "unknown"), (.agent_transcript_path // "")] | @tsv' 2>/dev/null)"

# Sanitize AGENT_ID to prevent path traversal
AGENT_ID="${AGENT_ID//[^a-zA-Z0-9_-]/_}"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Validate transcript path is under expected directories
  case "${TRANSCRIPT_PATH:a}" in
    /tmp/*|/private/tmp/*|"$HOME"/*) ;;
    *) echo "⚠ Unexpected transcript path: $AGENT_ID" >&2; exit 0 ;;
  esac

  AGENT_LOG_DIR="$LOG_DIR/$AGENT_ID"
  mkdir -p -m 700 "$AGENT_LOG_DIR"

  LOG_FILE="$AGENT_LOG_DIR/transcript-${TIMESTAMP}.json"
  if cp "$TRANSCRIPT_PATH" "$LOG_FILE"; then
    chmod 600 "$LOG_FILE"
    ln -sf "$LOG_FILE" "$AGENT_LOG_DIR/latest.json"

    find "$AGENT_LOG_DIR" -name "transcript-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true

    LINE_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
    echo "✓ Agent log saved: $AGENT_ID (${LINE_COUNT} lines)"
  else
    echo "⚠ Failed to save agent log: $AGENT_ID" >&2
  fi
else
  echo "⚠ Agent transcript not found: $AGENT_ID" >&2
fi

exit 0
