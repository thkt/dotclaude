#!/bin/bash
set -euo pipefail

# SubagentStop Hook Script
# Purpose: Auto-save subagent execution logs
# Uses agent_id and agent_transcript_path fields (v2.0.42+)

# Log directory configuration
LOG_DIR="$HOME/.claude/logs/agents"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Read JSON from stdin
INPUT=$(cat)

# Extract agent_id and agent_transcript_path from JSON
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.agent_transcript_path // ""')

# If transcript path exists and file is readable
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Create agent-specific directory
  AGENT_LOG_DIR="$LOG_DIR/$AGENT_ID"
  mkdir -p -m 700 "$AGENT_LOG_DIR"

  # Copy full transcript with timestamp
  FULL_LOG="$AGENT_LOG_DIR/full-${TIMESTAMP}.json"
  cp "$TRANSCRIPT_PATH" "$FULL_LOG"
  chmod 600 "$FULL_LOG"

  # Create summary (last 100 lines only)
  SUMMARY_LOG="$AGENT_LOG_DIR/summary-${TIMESTAMP}.json"
  tail -100 "$TRANSCRIPT_PATH" > "$SUMMARY_LOG"
  chmod 600 "$SUMMARY_LOG"

  # Update symlinks to latest logs
  ln -sf "$FULL_LOG" "$AGENT_LOG_DIR/latest-full.json"
  ln -sf "$SUMMARY_LOG" "$AGENT_LOG_DIR/latest-summary.json"

  # Record statistics
  LINE_COUNT=$(wc -l < "$TRANSCRIPT_PATH" | tr -d ' ')
  FILE_SIZE=$(stat -f%z "$TRANSCRIPT_PATH" 2>/dev/null || stat -c%s "$TRANSCRIPT_PATH" 2>/dev/null || echo "unknown")

  # Create metadata file
  META_LOG="$AGENT_LOG_DIR/meta-${TIMESTAMP}.json"
  cat > "$META_LOG" <<METAEOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "agent_id": "$AGENT_ID",
  "transcript_path": "$TRANSCRIPT_PATH",
  "line_count": $LINE_COUNT,
  "file_size_bytes": $FILE_SIZE,
  "log_files": {
    "full": "$FULL_LOG",
    "summary": "$SUMMARY_LOG"
  }
}
METAEOF
  chmod 600 "$META_LOG"

  # Move old logs to Trash (older than 30 days)
  find "$AGENT_LOG_DIR" -name "full-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true
  find "$AGENT_LOG_DIR" -name "summary-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true
  find "$AGENT_LOG_DIR" -name "meta-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true

  echo "✓ Agent log saved: $AGENT_ID (${LINE_COUNT} lines, ${FILE_SIZE} bytes)"
else
  echo "⚠ Agent transcript not found: $AGENT_ID" >&2
fi

exit 0
