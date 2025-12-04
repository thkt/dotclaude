#!/bin/bash

# SessionEnd Hook Script
# 目的: セッション終了時に統計情報を保存

SESSION_LOG_DIR="$HOME/.claude/logs/sessions"
SESSION_FILE="$SESSION_LOG_DIR/session-$(date +%Y%m%d-%H%M%S).json"

# ディレクトリ作成（存在しない場合）
mkdir -p "$SESSION_LOG_DIR"

# セッション情報をJSONで保存
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

# 最新のセッション情報をsummaryファイルにも保存
cp "$SESSION_FILE" "$SESSION_LOG_DIR/latest-session.json"

# 古いログを削除（30日以上前のものを削除）
find "$SESSION_LOG_DIR" -name "session-*.json" -mtime +30 -delete 2>/dev/null

# Agent logs rotation - keep last 50 directories
AGENT_LOG_DIR="$HOME/.claude/logs/agents"
if [ -d "$AGENT_LOG_DIR" ]; then
  agent_count=$(ls -1 "$AGENT_LOG_DIR" 2>/dev/null | wc -l)
  if [ "$agent_count" -gt 50 ]; then
    ls -1t "$AGENT_LOG_DIR" | tail -n +51 | while read dir; do
      mv "$AGENT_LOG_DIR/$dir" ~/.Trash/ 2>/dev/null
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
