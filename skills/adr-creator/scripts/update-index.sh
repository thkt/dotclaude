#!/bin/bash
# ADR索引更新スクリプト
# Usage: update-index.sh [adr-directory]

set -euo pipefail

ADR_DIR="${1:-docs/adr}"

if [ ! -d "$ADR_DIR" ]; then
  echo "❌ Error: Directory not found: $ADR_DIR"
  exit 1
fi

INDEX_FILE="$ADR_DIR/README.md"

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 ADR索引更新: $ADR_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 一時ファイル
TEMP_FILE=$(mktemp)
TEMP_PROPOSED=$(mktemp)
TEMP_ACCEPTED=$(mktemp)
TEMP_DEPRECATED=$(mktemp)
TEMP_SUPERSEDED=$(mktemp)

# クリーンアップ
trap "rm -f $TEMP_FILE $TEMP_PROPOSED $TEMP_ACCEPTED $TEMP_DEPRECATED $TEMP_SUPERSEDED" EXIT

# ヘッダー
cat > "$TEMP_FILE" <<'EOF'
# Architecture Decision Records

このディレクトリには、プロジェクトのアーキテクチャに関する重要な決定が記録されています。

## ADR一覧

| 番号 | タイトル | ステータス | 日付 |
|-----|---------|----------|------|
EOF

while IFS= read -r adr_file; do
  # ファイル名から番号抽出
  FILENAME=$(basename "$adr_file")
  NUMBER=$(echo "$FILENAME" | grep -oE '^[0-9]{4}')

  # タイトル抽出（最初の # 行）
  TITLE=$(grep -m 1 '^# ' "$adr_file" | sed 's/^# //')

  # ステータス抽出
  STATUS=$(grep -m 1 '^- Status:' "$adr_file" | sed 's/^- Status: //' | tr -d ' ')
  STATUS=${STATUS:-proposed}

  # 日付抽出
  DATE=$(grep -m 1 '^- Date:' "$adr_file" | sed 's/^- Date: //' | tr -d ' ')
  DATE=${DATE:-未設定}

  # テーブル行追加
  echo "| [$NUMBER]($FILENAME) | $TITLE | $STATUS | $DATE |" >> "$TEMP_FILE"

  # ステータス別集計（ファイル出力）
  case "$STATUS" in
    proposed)
      echo "$NUMBER|$TITLE" >> "$TEMP_PROPOSED"
      ;;
    accepted)
      echo "$NUMBER|$TITLE" >> "$TEMP_ACCEPTED"
      ;;
    deprecated)
      echo "$NUMBER|$TITLE" >> "$TEMP_DEPRECATED"
      ;;
    superseded)
      echo "$NUMBER|$TITLE" >> "$TEMP_SUPERSEDED"
      ;;
  esac
done < <(find "$ADR_DIR" -name "[0-9][0-9][0-9][0-9]-*.md" -type f | sort)

# ステータス別セクション
cat >> "$TEMP_FILE" <<'EOF'

## ステータス別

EOF

# Proposed
if [ -s "$TEMP_PROPOSED" ]; then
  echo "### 提案中 (Proposed)" >> "$TEMP_FILE"
  echo "" >> "$TEMP_FILE"
  while IFS='|' read -r num title; do
    echo "- **$num**: $title" >> "$TEMP_FILE"
  done < <(sort "$TEMP_PROPOSED")
  echo "" >> "$TEMP_FILE"
fi

# Accepted
if [ -s "$TEMP_ACCEPTED" ]; then
  echo "### 承認済み (Accepted)" >> "$TEMP_FILE"
  echo "" >> "$TEMP_FILE"
  while IFS='|' read -r num title; do
    echo "- **$num**: $title" >> "$TEMP_FILE"
  done < <(sort "$TEMP_ACCEPTED")
  echo "" >> "$TEMP_FILE"
fi

# Deprecated
if [ -s "$TEMP_DEPRECATED" ]; then
  echo "### 非推奨 (Deprecated)" >> "$TEMP_FILE"
  echo "" >> "$TEMP_FILE"
  while IFS='|' read -r num title; do
    echo "- **$num**: $title" >> "$TEMP_FILE"
  done < <(sort "$TEMP_DEPRECATED")
  echo "" >> "$TEMP_FILE"
fi

# Superseded
if [ -s "$TEMP_SUPERSEDED" ]; then
  echo "### 置き換え済み (Superseded)" >> "$TEMP_FILE"
  echo "" >> "$TEMP_FILE"
  while IFS='|' read -r num title; do
    echo "- **$num**: $title" >> "$TEMP_FILE"
  done < <(sort "$TEMP_SUPERSEDED")
  echo "" >> "$TEMP_FILE"
fi

# フッター
cat >> "$TEMP_FILE" <<'EOF'
## MADR形式について

このプロジェクトでは[MADR (Markdown Architecture Decision Records)](https://adr.github.io/madr/)形式を採用しています。

### ADRの作成方法

```bash
/adr "Decision Title"
```

### ステータスの意味

- **Proposed**: レビュー待ち
- **Accepted**: 承認済み、実装中または実装完了
- **Deprecated**: より良い代替案が見つかった
- **Superseded**: 別のADRに置き換えられた

---

*最終更新: {{UPDATE_DATE}}*
*自動生成: update-index.sh*
EOF

# 日付置換
UPDATE_DATE=$(date +%Y-%m-%d)
sed -i.bak "s/{{UPDATE_DATE}}/$UPDATE_DATE/g" "$TEMP_FILE"
rm -f "$TEMP_FILE.bak"

# ファイル置換
mv "$TEMP_FILE" "$INDEX_FILE"

echo -e "${GREEN}✅ 索引更新完了: $INDEX_FILE${NC}"
echo ""
echo "📊 統計:"
echo "  Proposed: $(wc -l < "$TEMP_PROPOSED" | tr -d ' ')"
echo "  Accepted: $(wc -l < "$TEMP_ACCEPTED" | tr -d ' ')"
echo "  Deprecated: $(wc -l < "$TEMP_DEPRECATED" | tr -d ' ')"
echo "  Superseded: $(wc -l < "$TEMP_SUPERSEDED" | tr -d ' ')"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
