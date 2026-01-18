#!/bin/bash
# IDR Confirmation Gate (pre-commit)
# IDR recording happens in session-end.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_utils.sh"

BLOCKER_LINE="- [ ] 確認完了（このチェックボックスをチェックして保存）"

get_editor() {
  if command -v cursor &> /dev/null; then
    echo "cursor --wait"
  elif command -v code &> /dev/null; then
    echo "code --wait"
  else
    echo "${EDITOR:-vim}"
  fi
}

get_questions() {
  echo "- [ ] 変更内容を理解しましたか？"
  echo "- [ ] テストは十分ですか？"
  echo "- [ ] 既存機能への影響は確認しましたか？"
}

main() {
  has_session_changes || exit 0
  git diff --cached --quiet && exit 0

  local idr_file
  idr_file=$(resolve_idr_file)
  local idr_dir
  idr_dir=$(dirname "$idr_file")
  mkdir -p "$idr_dir"
  local CONFIRM_FILE="${idr_dir}/.idr-confirm.md"

  local diff_stat
  diff_stat=$(git diff --cached --stat)

  local questions
  questions=$(get_questions)

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

  local -a editor_cmd
  read -ra editor_cmd <<< "$(get_editor)"
  echo "📝 確認ファイルを開いています: $CONFIRM_FILE"
  "${editor_cmd[@]}" "$CONFIRM_FILE"

  if grep -q "\[ \] 確認完了" "$CONFIRM_FILE"; then
    echo "❌ 確認が完了していません"
    echo "   チェックボックスを [x] にしてからコミットしてください"
    exit 1
  fi

  echo "✅ 確認完了。コミットを実行します"
}

main "$@"
