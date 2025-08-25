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

echo "Session data saved to: $SESSION_FILE"
