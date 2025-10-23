#!/bin/bash
# ADR作成前チェックスクリプト
# Usage: pre-check.sh "ADR Title"

set -euo pipefail

TITLE="$1"
ADR_DIR="${ADR_DIR:-docs/adr}"
THRESHOLD="${DUPLICATE_THRESHOLD:-0.7}"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ADR作成前チェック"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. タイトル検証
echo "📋 1. タイトル検証"
TITLE_LENGTH=${#TITLE}
if [ $TITLE_LENGTH -lt 5 ] || [ $TITLE_LENGTH -gt 64 ]; then
  echo -e "${RED}❌ タイトル長エラー: ${TITLE_LENGTH}文字 (推奨: 5-64文字)${NC}"
  exit 1
fi

# 禁止文字チェック
FORBIDDEN_CHARS='[/:*?"<>|]'
if [[ "$TITLE" =~ $FORBIDDEN_CHARS ]]; then
  echo -e "${RED}❌ 禁止文字が含まれています: / : * ? \" < > |${NC}"
  exit 1
fi

echo -e "${GREEN}✅ タイトル長: ${TITLE_LENGTH}文字${NC}"
echo -e "${GREEN}✅ 使用文字: OK${NC}"
echo ""

# 2. ディレクトリ検証
echo "📁 2. ディレクトリ検証"
if [ ! -d "$ADR_DIR" ]; then
  echo -e "${YELLOW}⚠️  ディレクトリ未作成: $ADR_DIR${NC}"
  echo "   自動作成を試行します..."
  mkdir -p "$ADR_DIR"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ ディレクトリ作成成功${NC}"
  else
    echo -e "${RED}❌ ディレクトリ作成失敗${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ ディレクトリ存在: $ADR_DIR${NC}"
fi

# 書き込み権限確認
if [ ! -w "$ADR_DIR" ]; then
  echo -e "${RED}❌ 書き込み権限なし: $ADR_DIR${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 書き込み権限: OK${NC}"
echo ""

# 3. 採番
echo "🔢 3. ADR番号採番"
LAST_NUM=$(ls "$ADR_DIR" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1 || echo "0000")
NEXT_NUM=$(printf "%04d" $((10#$LAST_NUM + 1)))
echo -e "${GREEN}✅ 次の番号: ${NEXT_NUM}${NC}"

# Slug生成
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
FILENAME="${NEXT_NUM}-${SLUG}.md"
echo -e "${GREEN}✅ ファイル名: ${FILENAME}${NC}"
echo ""

# 4. 重複チェック（簡易版: タイトル文字列の類似度）
echo "🔍 4. 重複チェック"
if [ -d "$ADR_DIR" ] && [ "$(ls -A $ADR_DIR 2>/dev/null)" ]; then
  SIMILAR_FOUND=false
  while IFS= read -r existing_file; do
    # タイトル抽出（最初の#行）
    EXISTING_TITLE=$(grep -m 1 '^# ' "$existing_file" | sed 's/^# //')

    # 簡易類似度チェック（共通単語数）
    COMMON_WORDS=$(comm -12 \
      <(echo "$TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      <(echo "$EXISTING_TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      | wc -l)

    TITLE_WORDS=$(echo "$TITLE" | tr ' ' '\n' | wc -l)

    if [ $TITLE_WORDS -gt 0 ]; then
      SIMILARITY=$(awk "BEGIN {printf \"%.2f\", $COMMON_WORDS / $TITLE_WORDS}")

      if (( $(awk "BEGIN {print ($SIMILARITY >= $THRESHOLD)}") )); then
        echo -e "${YELLOW}⚠️  類似ADR検出 (類似度: ${SIMILARITY}): $(basename $existing_file)${NC}"
        echo "   既存: $EXISTING_TITLE"
        SIMILAR_FOUND=true
      fi
    fi
  done < <(find "$ADR_DIR" -name "*.md" -type f)

  if [ "$SIMILAR_FOUND" = false ]; then
    echo -e "${GREEN}✅ 類似ADRなし${NC}"
  else
    echo ""
    echo -e "${YELLOW}💡 関連性を確認してください。必要に応じて既存ADRの更新を検討してください。${NC}"
  fi
else
  echo -e "${GREEN}✅ 既存ADRなし（初回作成）${NC}"
fi
echo ""

# 5. 日付検証
echo "📅 5. 日付検証"
CURRENT_DATE=$(date +%Y-%m-%d)
echo -e "${GREEN}✅ 作成日: ${CURRENT_DATE}${NC}"
echo ""

# 6. まとめ
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 作成可能です${NC}"
echo ""
echo "次の情報で作成します:"
echo "  番号: ${NEXT_NUM}"
echo "  ファイル名: ${FILENAME}"
echo "  作成日: ${CURRENT_DATE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 結果をJSONで出力（Claude Codeでの解析用）
cat <<EOF

{
  "status": "ok",
  "number": "${NEXT_NUM}",
  "filename": "${FILENAME}",
  "slug": "${SLUG}",
  "date": "${CURRENT_DATE}",
  "warnings": []
}
EOF

exit 0
