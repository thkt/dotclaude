#!/bin/bash
set -euo pipefail

# SessionEnd Hook Script
# Purpose: Save session statistics and record implementation to IDR

SESSION_LOG_DIR="$HOME/.claude/logs/sessions"
WORKSPACE_DIR="$HOME/.claude/workspace"
PENDING_LOG="$WORKSPACE_DIR/.pending-idr.log"
PLANNING_DIR="$WORKSPACE_DIR/planning"
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
  log_size=$(stat -f%z "$SUBAGENT_LOG" 2>/dev/null || stat -c%s "$SUBAGENT_LOG" 2>/dev/null || echo 0)
  if [ "$log_size" -gt 1048576 ]; then  # 1MB
    tail -c 512000 "$SUBAGENT_LOG" > "$SUBAGENT_LOG.tmp"
    mv "$SUBAGENT_LOG.tmp" "$SUBAGENT_LOG"
  fi
fi

# IDR Recording: Summarize session implementation and record to IDR
record_idr() {
  # Skip if no pending log
  if [ ! -f "$PENDING_LOG" ]; then
    return
  fi

  # Get list of changed files
  local changes
  changes=$(cat "$PENDING_LOG" | cut -d'|' -f2 | sort -u)
  local file_count
  file_count=$(echo "$changes" | wc -l | tr -d ' ')

  # Skip if no changes
  if [ "$file_count" -eq 0 ] || [ -z "$changes" ]; then
    rm -f "$PENDING_LOG"
    return
  fi

  # Find IDR file location
  local idr_file
  local sow_file=$(find "$PLANNING_DIR" -name "sow.md" -type f 2>/dev/null | head -1)
  if [ -n "$sow_file" ]; then
    idr_file="$(dirname "$sow_file")/idr.md"
  else
    local date_dir="$PLANNING_DIR/$(date +%Y-%m-%d)"
    mkdir -p "$date_dir"
    idr_file="$date_dir/idr.md"
  fi

  # Get git diff and summarize implementation
  local summary=""
  if command -v claude &> /dev/null; then
    local diff
    diff=$(git diff HEAD~1 HEAD 2>/dev/null || git diff 2>/dev/null || echo "")
    if [ -n "$diff" ]; then
      summary=$(echo "$diff" | head -500 | claude -p "
Summarize what was implemented in this session from the diff below.
- What was implemented/fixed
- Key design decisions and rationale (if any)

Format:
### Implementation
- [Description of change 1]
- [Description of change 2]

### Design Decisions (if any)
- [Decision and rationale]
" 2>/dev/null || echo "")
    fi
  fi

  # Record to IDR
  {
    echo ""
    echo "---"
    echo ""
    echo "## $(date +%Y-%m-%d) Session Record"
    echo ""
    if [ -n "$summary" ]; then
      echo "$summary"
    else
      echo "### Changed Files"
      echo ""
      echo "$changes" | while read -r f; do echo "- \`$f\`"; done
    fi
    echo ""
  } >> "$idr_file"

  # Clear pending log
  rm -f "$PENDING_LOG"

  echo "IDR recorded: $idr_file"
}

# Execute IDR recording
record_idr

echo "Session data saved to: $SESSION_FILE"
