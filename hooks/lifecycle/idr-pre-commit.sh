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
CONFIRM_FILE="/tmp/claude/idr-confirm-$(date +%s).md"
BLOCKER_LINE="⚠️_この行を消すとコミットされます_⚠️"

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

  # Claude CLIがない場合はスキップ
  if ! command -v claude &> /dev/null; then
    echo "（Claude CLIが見つかりません。手動で確認してください）"
    return
  fi

  echo "$diff" | claude -p "
あなたはシニアエンジニアです。以下のコード変更について、開発者が理解を確認するための質問を3-5個生成してください。

観点:
- 設計意図・なぜこの実装にしたか
- 潜在的なバグやエッジケース
- テストで確認すべきこと
- 既存コードへの影響

フォーマット:
1. [質問]
2. [質問]
...

変更内容:
" 2>/dev/null || echo "（質問生成に失敗しました。手動で確認してください）"
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

  # 蓄積された変更ファイル一覧
  local changes
  changes=$(cat "$PENDING_LOG" | cut -d'|' -f2 | sort -u)

  # git diffを取得
  local diff
  diff=$(git diff --cached)

  # 確認質問を生成
  local questions
  questions=$(generate_questions "$diff")

  # 確認ファイル用ディレクトリ作成
  mkdir -p /tmp/claude

  # 確認ファイル作成
  cat > "$CONFIRM_FILE" << EOF
# 🔍 コミット前確認

## 変更ファイル一覧

\`\`\`
${changes}
\`\`\`

## 確認質問

${questions}

## あなたの回答・メモ

（ここに回答を記入してください）

---

${BLOCKER_LINE}
EOF

  # エディタで開く
  local editor
  editor=$(get_editor)
  echo "📝 確認ファイルを開いています..."
  $editor "$CONFIRM_FILE"

  # ブロッカー行チェック
  if grep -q "$BLOCKER_LINE" "$CONFIRM_FILE"; then
    echo ""
    echo "❌ 確認が完了していません"
    echo "   ブロッカー行を削除してからコミットしてください"
    echo ""
    rm -f "$CONFIRM_FILE"
    exit 1
  fi

  # IDRに記録
  local idr_file
  idr_file=$(find_idr_file)
  mkdir -p "$(dirname "$idr_file")"

  {
    echo ""
    echo "---"
    echo ""
    echo "## $(date +%Y-%m-%d) コミット確認"
    echo ""
    cat "$CONFIRM_FILE"
  } >> "$idr_file"

  # 蓄積ログをクリア
  rm -f "$PENDING_LOG"
  rm -f "$CONFIRM_FILE"

  echo ""
  echo "✅ IDR記録完了: $idr_file"
  echo "✅ コミットを実行します"
  echo ""

  exit 0
}

main "$@"
