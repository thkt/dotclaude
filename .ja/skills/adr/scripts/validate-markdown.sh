#!/bin/zsh
# Markdown Lint 検証スクリプト
# 使用法: validate-markdown.sh <markdown-file-or-directory>
# 終了コード: 0 = 成功（警告含む）, 1 = 致命的エラー

set -e

# 引数
TARGET="${1:-.}"

# カラー定義
source "$(dirname "$0")/colors.sh"

# markdownlint-cli2 のインストール確認
if ! command -v markdownlint-cli2 &> /dev/null; then
  echo "${BLUE}ℹ️  Markdown lint skipped (markdownlint-cli2 not installed)${NC}"
  echo "${BLUE}   Install: npm install -g markdownlint-cli2${NC}"
  exit 0
fi

# 対象ファイルの存在確認
if [ ! -e "$TARGET" ]; then
  echo "${RED}❌ Error: Target not found: $TARGET${NC}"
  exit 1
fi

# 設定ファイル探索チェーン:
# 1. $MARKDOWNLINT_CONFIG (明示的上書き)
# 2. $PWD/.markdownlint.json (プロジェクトローカル)
# 3. ~/.claude/.markdownlint.json (グローバルデフォルト)
# 4. 設定なし (markdownlint デフォルト)
CONFIG_FILE=""
CONFIG_SOURCE=""

if [ -n "${MARKDOWNLINT_CONFIG:-}" ] && [ -f "$MARKDOWNLINT_CONFIG" ]; then
  CONFIG_FILE="$MARKDOWNLINT_CONFIG"
  CONFIG_SOURCE="env"
elif [ -f ".markdownlint.json" ]; then
  CONFIG_FILE=".markdownlint.json"
  CONFIG_SOURCE="project"
elif [ -f "$HOME/.claude/.markdownlint.json" ]; then
  CONFIG_FILE="$HOME/.claude/.markdownlint.json"
  CONFIG_SOURCE="global"
fi

# コマンド構築
args=(markdownlint-cli2)
if [ -n "$CONFIG_FILE" ]; then
  args+=(--config "$CONFIG_FILE")
fi
args+=("$TARGET")

# lint 実行
if [ -n "$CONFIG_SOURCE" ]; then
  echo "${BLUE}📝 Running Markdown lint (config: $CONFIG_SOURCE)...${NC}"
else
  echo "${BLUE}📝 Running Markdown lint (default config)...${NC}"
fi

# 実行と結果取得
if "${args[@]}" 2>&1; then
  echo "${GREEN}✅ Markdown lint: OK${NC}"
  exit 0
else
  echo "${YELLOW}⚠️  Markdown lint: Issues found (see above)${NC}"
  exit 0  # ブロックしない - 警告のみ
fi
