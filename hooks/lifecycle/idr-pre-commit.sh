#!/bin/bash
# IDR強制確認スクリプト（pre-commit用）
# コミット前に変更内容の理解を確認し、IDRに記録
#
# BOA対応: Responsibility層ゲート - 確認なしにはコミットさせない
# 参考: https://zenn.dev/buno15/articles/bf8c2c7c5a137b

set -euo pipefail

# 設定
WORKSPACE_DIR="${HOME}/.claude/workspace"
PENDING_LOG="${WORKSPACE_DIR}/.pending-idr.log"
PLANNING_DIR="${WORKSPACE_DIR}/planning"
BLOCKER_LINE="[ ] 確認完了（このチェックボックスをチェックして保存）"

# エディタ設定（優先順位: cursor > code > vim）
get_editor() {
  if command -v cursor &> /dev/null; then
    echo "cursor --wait"
  elif command -v code &> /dev/null; then
    echo "code --wait"
  else
    echo "${EDITOR:-vim}"
  fi
}

# Claude CLIで確認質問を生成
generate_questions() {
  local diff="$1"
  local file_count="$2"

  # Claude CLIがない場合はスキップ
  if ! command -v claude &> /dev/null; then
    echo "- [ ] 変更内容を理解しましたか？"
    echo "- [ ] テストは十分ですか？"
    echo "- [ ] 既存機能への影響は確認しましたか？"
    return
  fi

  # 変更が少ない場合は簡易質問
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

# 現在のIDRファイルを特定
find_idr_file() {
  # SOWがあればその近くのIDR
  local sow_file=$(find "$PLANNING_DIR" -name "sow.md" -type f 2>/dev/null | head -1)
  if [ -n "$sow_file" ]; then
    local sow_dir=$(dirname "$sow_file")
    echo "${sow_dir}/idr.md"
    return
  fi

  # なければデフォルト
  mkdir -p "${PLANNING_DIR}/default"
  echo "${PLANNING_DIR}/default/idr.md"
}

# メイン処理
main() {
  # 蓄積ログがなければスキップ（Claude以外の変更）
  if [ ! -f "$PENDING_LOG" ]; then
    exit 0
  fi

  # ステージされた変更がなければスキップ
  if git diff --cached --quiet; then
    exit 0
  fi

  # IDRファイルの場所を特定（確認ファイルも同じディレクトリに配置）
  local idr_file
  idr_file=$(find_idr_file)
  local idr_dir
  idr_dir=$(dirname "$idr_file")
  mkdir -p "$idr_dir"
  local CONFIRM_FILE="${idr_dir}/.idr-confirm.md"

  # 蓄積された変更ファイル一覧
  local changes
  changes=$(cat "$PENDING_LOG" | cut -d'|' -f2 | sort -u)
  local file_count
  file_count=$(echo "$changes" | wc -l | tr -d ' ')

  # git diffを取得（サマリー）
  local diff_stat
  diff_stat=$(git diff --cached --stat)
  local diff
  diff=$(git diff --cached)

  # 確認質問を生成
  local questions
  questions=$(generate_questions "$diff" "$file_count")

  # 確認ファイル作成
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

  # エディタで開く
  local editor
  editor=$(get_editor)
  echo "📝 確認ファイルを開いています: $CONFIRM_FILE"
  $editor "$CONFIRM_FILE"

  # チェックボックス確認
  if grep -q "\[ \] 確認完了" "$CONFIRM_FILE"; then
    echo ""
    echo "❌ 確認が完了していません"
    echo "   チェックボックスを [x] にしてからコミットしてください"
    echo ""
    exit 1
  fi

  # IDRに記録（idr_fileは既に上で定義済み）
  {
    echo ""
    echo "---"
    echo ""
    echo "## $(date +%Y-%m-%d) コミット記録"
    echo ""
    echo "### 変更ファイル"
    echo ""
    echo "$changes" | while read -r f; do echo "- \`$f\`"; done
    echo ""
    echo "### 確認内容"
    echo ""
    grep -E "^\- \[x\]" "$CONFIRM_FILE" 2>/dev/null || echo "（確認項目なし）"
    echo ""
    # メモがあれば追加
    local memo
    memo=$(sed -n '/^## メモ/,/^---/p' "$CONFIRM_FILE" | grep -v "^##" | grep -v "^---" | grep -v "^$" || true)
    if [ -n "$memo" ]; then
      echo "### メモ"
      echo ""
      echo "$memo"
      echo ""
    fi
  } >> "$idr_file"

  # 蓄積ログをクリア（確認ファイルは残す）
  rm -f "$PENDING_LOG"

  echo ""
  echo "✅ IDR記録完了: $idr_file"
  echo "✅ コミットを実行します"
  echo ""

  exit 0
}

main "$@"
