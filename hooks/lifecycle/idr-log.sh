#!/bin/bash
# IDR軽量記録スクリプト
# PostToolUse時に変更を蓄積（邪魔しない）
#
# BOA対応: Meaning層での作業を記録し、Responsibility層ゲート（pre-commit）に渡す

set -euo pipefail

# 設定
WORKSPACE_DIR="${HOME}/.claude/workspace"
PENDING_LOG="${WORKSPACE_DIR}/.pending-idr.log"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)

# ツール入力からファイルパスを取得
FILE_PATH=$(echo "${CLAUDE_TOOL_INPUT:-}" | jq -r '.file_path // empty' 2>/dev/null || echo "")

# ファイルパスがない場合はスキップ
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# workspaceディレクトリがなければ作成
mkdir -p "$WORKSPACE_DIR"

# 変更を蓄積ログに追記
# フォーマット: timestamp|file_path|tool_name
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
echo "${TIMESTAMP}|${FILE_PATH}|${TOOL_NAME}" >> "$PENDING_LOG"

# サイレントに成功（開発フローを邪魔しない）
exit 0
