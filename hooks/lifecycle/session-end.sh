#!/bin/bash
# Session end: save stats and record IDR
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_utils.sh"

SESSION_LOG_DIR="$HOME/.claude/logs/sessions"
SESSION_FILE="$SESSION_LOG_DIR/session-$(date +%Y%m%d-%H%M%S).json"

mkdir -p "$SESSION_LOG_DIR"

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

cp "$SESSION_FILE" "$SESSION_LOG_DIR/latest-session.json"

find "$SESSION_LOG_DIR" -name "session-*.json" -mtime +30 -exec mv {} ~/.Trash/ \; 2>/dev/null || true

AGENT_LOG_DIR="$HOME/.claude/logs/agents"
if [ -d "$AGENT_LOG_DIR" ]; then
  agent_count=$(ls -1 "$AGENT_LOG_DIR" 2>/dev/null | wc -l)
  if [ "$agent_count" -gt 50 ]; then
    ls -1t "$AGENT_LOG_DIR" | tail -n +51 | while IFS= read -r dir; do
      mv "$AGENT_LOG_DIR/$dir" ~/.Trash/ 2>/dev/null || true
    done
  fi
fi

SUBAGENT_LOG="$HOME/.claude/logs/subagent.log"
MAX_LOG_SIZE=1048576
if [ -f "$SUBAGENT_LOG" ]; then
  log_size=$(wc -c < "$SUBAGENT_LOG" 2>/dev/null | tr -d ' ')
  if [ "$log_size" -gt "$MAX_LOG_SIZE" ]; then
    tail -c 512000 "$SUBAGENT_LOG" > "$SUBAGENT_LOG.tmp"
    mv "$SUBAGENT_LOG.tmp" "$SUBAGENT_LOG"
  fi
fi

record_idr() {
  has_session_changes || return

  local idr_file
  idr_file=$(resolve_idr_file)

  local session_jsonl
  session_jsonl=$(find_session_jsonl)

  local summary=""
  local context=""

  if command -v claude &> /dev/null; then
    if [ -n "$session_jsonl" ] && [ -f "${SCRIPT_DIR}/_context-extractor.sh" ]; then
      context=$("${SCRIPT_DIR}/_context-extractor.sh" "$session_jsonl" 2>/dev/null || echo "")
    fi

    local diff
    diff=$(git diff HEAD 2>/dev/null | head -300 || echo "")

    if [ -n "$context" ] || [ -n "$diff" ]; then
      summary=$(printf "%s\n\n%s" "$context" "$diff" | claude -p "
セッションの変更内容を詳細に記録してください。

以下のフォーマットで出力:

### 意図 (Intent)
ユーザーリクエストから、何を達成しようとしていたか

### 実装内容 (Implementation)
各ファイルの変更について:
- ファイル名: 変更内容と理由

### 設計決定 (Design Decisions)
重要な設計判断があれば記載（なければ省略可）

### 注意点 (Notes)
将来のレビュー者への注意点があれば
" 2>/dev/null || echo "")
    fi
  fi

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
      if [ -n "$context" ]; then
        echo "$context"
      else
        echo "(No changes detected)"
      fi
    fi
    echo ""
  } >> "$idr_file"

  echo "IDR recorded: $idr_file"
}

record_idr

echo "Session data saved to: $SESSION_FILE"
