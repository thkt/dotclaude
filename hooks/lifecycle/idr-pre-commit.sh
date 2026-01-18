#!/bin/bash
# IDR Confirmation Gate Script (pre-commit)
# Confirms understanding of changes before commit
#
# BOA: Responsibility layer gate - no commit without confirmation
# Note: IDR recording is done in session-end.sh (summarizes at session end)
# Ref: https://zenn.dev/buno15/articles/bf8c2c7c5a137b

set -euo pipefail

# Configuration
WORKSPACE_DIR="${HOME}/.claude/workspace"
PENDING_LOG="${WORKSPACE_DIR}/.pending-idr.log"
PLANNING_DIR="${WORKSPACE_DIR}/planning"
BLOCKER_LINE="- [ ] 確認完了（このチェックボックスをチェックして保存）"

# Editor settings (priority: cursor > code > vim)
get_editor() {
  if command -v cursor &> /dev/null; then
    echo "cursor --wait"
  elif command -v code &> /dev/null; then
    echo "code --wait"
  else
    echo "${EDITOR:-vim}"
  fi
}

# Generate confirmation questions with Claude CLI
generate_questions() {
  local diff="$1"
  local file_count="$2"

  # Skip if Claude CLI not available
  if ! command -v claude &> /dev/null; then
    echo "- [ ] 変更内容を理解しましたか？"
    echo "- [ ] テストは十分ですか？"
    echo "- [ ] 既存機能への影響は確認しましたか？"
    return
  fi

  # Simple questions for small changes
  if [ "$file_count" -le 2 ]; then
    echo "$diff" | claude -p "
以下の変更について、開発者が確認すべき質問を2-3個生成してください。
チェックボックス形式で出力してください。

フォーマット:
- [ ] 質問1
- [ ] 質問2

変更内容:
" 2>/dev/null || echo "- [ ] 変更内容を確認しましたか？"
  else
    echo "$diff" | claude -p "
以下の変更について、開発者が確認すべき質問を3-5個生成してください。
チェックボックス形式で出力してください。

観点:
- 設計意図
- エッジケース
- テスト観点

フォーマット:
- [ ] 質問1
- [ ] 質問2

変更内容:
" 2>/dev/null || echo "- [ ] 変更内容を確認しましたか？"
  fi
}

# Find current IDR file location
find_idr_file() {
  # Use SOW directory if exists
  local sow_file=$(find "$PLANNING_DIR" -name "sow.md" -type f 2>/dev/null | head -1)
  if [ -n "$sow_file" ]; then
    local sow_dir=$(dirname "$sow_file")
    echo "${sow_dir}/idr.md"
    return
  fi

  # Otherwise use date-based directory
  local date_dir="${PLANNING_DIR}/$(date +%Y-%m-%d)"
  mkdir -p "$date_dir"
  echo "${date_dir}/idr.md"
}

# Main process
main() {
  # Skip if no pending log (non-Claude changes)
  if [ ! -f "$PENDING_LOG" ]; then
    exit 0
  fi

  # Skip if no staged changes
  if git diff --cached --quiet; then
    exit 0
  fi

  # Find IDR file location (confirm file in same directory)
  local idr_file
  idr_file=$(find_idr_file)
  local idr_dir
  idr_dir=$(dirname "$idr_file")
  mkdir -p "$idr_dir"
  local CONFIRM_FILE="${idr_dir}/.idr-confirm.md"

  # Get accumulated changed files
  local changes
  changes=$(cat "$PENDING_LOG" | cut -d'|' -f2 | sort -u)
  local file_count
  file_count=$(echo "$changes" | wc -l | tr -d ' ')

  # Get git diff summary
  local diff_stat
  diff_stat=$(git diff --cached --stat)
  local diff
  diff=$(git diff --cached)

  # Generate confirmation questions
  local questions
  questions=$(generate_questions "$diff" "$file_count")

  # Create confirmation file
  cat > "$CONFIRM_FILE" << EOF
# コミット確認

> $(date +%Y-%m-%d\ %H:%M)

## 変更サマリー

\`\`\`
${diff_stat}
\`\`\`

## 確認項目

${questions}

## メモ（任意）



---

### 完了確認

${BLOCKER_LINE}
EOF

  # Open in editor
  local editor
  editor=$(get_editor)
  echo "📝 確認ファイルを開いています: $CONFIRM_FILE"
  $editor "$CONFIRM_FILE"

  # Check confirmation checkbox
  if grep -q "\[ \] 確認完了" "$CONFIRM_FILE"; then
    echo ""
    echo "❌ 確認が完了していません"
    echo "   チェックボックスを [x] にしてからコミットしてください"
    echo ""
    exit 1
  fi

  # Keep pending log for session-end IDR recording
  # (session-end.sh summarizes and records to IDR)

  echo ""
  echo "✅ 確認完了。コミットを実行します"
  echo ""

  exit 0
}

main "$@"
