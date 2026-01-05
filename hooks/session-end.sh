#!/bin/bash
set -euo pipefail

# SessionEnd Hook Script
# Purpose: Save session statistics on session end

SESSION_LOG_DIR="$HOME/.claude/logs/sessions"
SESSION_FILE="$SESSION_LOG_DIR/session-$(date +%Y%m%d-%H%M%S).json"

# Create directory if not exists
mkdir -p "$SESSION_LOG_DIR"

# Save session info as JSON
cat > "$SESSION_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration": "${SESSION_DURATION:-unknown}",
  "files_modified": $(git status --porcelain 2>/dev/null | wc -l | tr -d ' '),
  "current_branch": "$(git branch --show-current 2>/dev/null || echo 'not-git')",
  "working_directory": "$(pwd)",
  "session_cost": "${SESSION_COST:-0}",
  "tokens_used": "${TOKENS_USED:-0}",
  "tools_used": "${TOOLS_USED:-unknown}"
}
EOF

# Also save to latest-session.json for quick access
cp "$SESSION_FILE" "$SESSION_LOG_DIR/latest-session.json"

# Move old logs to Trash (older than 30 days)
find "$SESSION_LOG_DIR" -name "session-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true

# Agent logs rotation - keep last 50 directories
AGENT_LOG_DIR="$HOME/.claude/logs/agents"
if [ -d "$AGENT_LOG_DIR" ]; then
  agent_count=$(ls -1 "$AGENT_LOG_DIR" 2>/dev/null | wc -l)
  if [ "$agent_count" -gt 50 ]; then
    ls -1t "$AGENT_LOG_DIR" | tail -n +51 | while IFS= read -r dir; do
      mv "$AGENT_LOG_DIR/$dir" ~/.Trash/ 2>/dev/null || true
    done
  fi
fi

# Subagent log rotation - keep last 1MB
SUBAGENT_LOG="$HOME/.claude/logs/subagent.log"
if [ -f "$SUBAGENT_LOG" ]; then
  log_size=$(stat -f%z "$SUBAGENT_LOG" 2>/dev/null || echo 0)
  if [ "$log_size" -gt 1048576 ]; then  # 1MB
    tail -c 512000 "$SUBAGENT_LOG" > "$SUBAGENT_LOG.tmp"
    mv "$SUBAGENT_LOG.tmp" "$SUBAGENT_LOG"
  fi
fi

echo "Session data saved to: $SESSION_FILE"
