#!/bin/bash
# IDR軽量記録スクリプト
# PostToolUse時に変更を蓄積（邪魔しない）
#
# BOA対応: Meaning層での作業を記録し、Responsibility層ゲート（pre-commit）に渡す

# エラーで止めない（サイレントに動作）
set +e

# 設定
WORKSPACE_DIR="${HOME}/.claude/workspace"
PENDING_LOG="${WORKSPACE_DIR}/.pending-idr.log"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)

# stdinからJSONを読み取り、ファイルパスを取得
FILE_PATH=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

# ファイルパスがない場合はスキップ
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# workspaceディレクトリがなければ作成
mkdir -p "$WORKSPACE_DIR"

# 変更を蓄積ログに追記
# フォーマット: timestamp|file_path|tool_name
TOOL_NAME=$(echo "$FILE_PATH" | xargs -I{} basename {} 2>/dev/null || echo "unknown")
echo "${TIMESTAMP}|${FILE_PATH}" >> "$PENDING_LOG"

# サイレントに成功（開発フローを邪魔しない）
exit 0
