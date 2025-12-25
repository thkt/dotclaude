#!/bin/bash
# Markdown Lint 検証スクリプト
# 使用方法: validate-markdown.sh <markdownファイルまたはディレクトリ>
# 終了コード: 0 = 成功（警告含む）, 1 = 致命的エラー

set -euo pipefail

# 引数
TARGET="${1:-.}"

# 色定義（validate-adr.sh パターンに合わせる）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# markdownlint-cli2 のインストール確認
if ! command -v markdownlint-cli2 &> /dev/null; then
  echo -e "${BLUE}ℹ️  Markdown lintをスキップしました（markdownlint-cli2未インストール）${NC}"
  echo -e "${BLUE}   インストール: npm install -g markdownlint-cli2${NC}"
  exit 0
fi

# 対象の存在確認
if [ ! -e "$TARGET" ]; then
  echo -e "${RED}❌ エラー: 対象が見つかりません: $TARGET${NC}"
  exit 1
fi

# 設定ファイル発見チェーン:
# 1. $MARKDOWNLINT_CONFIG（明示的な上書き）
# 2. $PWD/.markdownlint.json（プロジェクトローカル）
# 3. ~/.claude/.markdownlint.json（グローバルデフォルト）
# 4. 設定なし（markdownlintデフォルト）
CONFIG_FILE=""
CONFIG_SOURCE=""

if [ -n "${MARKDOWNLINT_CONFIG:-}" ] && [ -f "$MARKDOWNLINT_CONFIG" ]; then
  CONFIG_FILE="$MARKDOWNLINT_CONFIG"
  CONFIG_SOURCE="環境変数"
elif [ -f ".markdownlint.json" ]; then
  CONFIG_FILE=".markdownlint.json"
  CONFIG_SOURCE="プロジェクト"
elif [ -f "$HOME/.claude/.markdownlint.json" ]; then
  CONFIG_FILE="$HOME/.claude/.markdownlint.json"
  CONFIG_SOURCE="グローバル"
fi

# コマンド構築
CMD="markdownlint-cli2"
if [ -n "$CONFIG_FILE" ]; then
  CMD="$CMD --config \"$CONFIG_FILE\""
fi
CMD="$CMD \"$TARGET\""

# lint実行
if [ -n "$CONFIG_SOURCE" ]; then
  echo -e "${BLUE}📝 Markdown lintを実行中（設定: $CONFIG_SOURCE）...${NC}"
else
  echo -e "${BLUE}📝 Markdown lintを実行中（デフォルト設定）...${NC}"
fi

# 実行と結果取得
if eval "$CMD" 2>&1; then
  echo -e "${GREEN}✅ Markdown lint: OK${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Markdown lint: 問題が見つかりました（上記参照）${NC}"
  exit 0  # 非ブロッキング - 警告のみ
fi
