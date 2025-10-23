#!/bin/bash
# ADR検証スクリプト
# Usage: validate-adr.sh <adr-file>

set -euo pipefail

ADR_FILE="$1"

if [ ! -f "$ADR_FILE" ]; then
  echo "❌ Error: File not found: $ADR_FILE"
  exit 1
fi

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ADR検証レポート: $(basename $ADR_FILE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WARNINGS=0
ERRORS=0

# 1. 必須セクションチェック
echo "📋 1. 必須セクション検証"
REQUIRED_SECTIONS=(
  "Context and Problem Statement"
  "Considered Options"
  "Decision Outcome"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if grep -q "## $section" "$ADR_FILE"; then
    echo -e "${GREEN}✅ $section${NC}"
  else
    echo -e "${RED}❌ $section - 未記入${NC}"
    ((ERRORS++))
  fi
done
echo ""

# 2. メタデータ検証
echo "📌 2. メタデータ検証"
REQUIRED_META=(
  "Status:"
  "Date:"
)

for meta in "${REQUIRED_META[@]}"; do
  if grep -q "^- $meta" "$ADR_FILE"; then
    VALUE=$(grep "^- $meta" "$ADR_FILE" | head -1)
    echo -e "${GREEN}✅ $VALUE${NC}"
  else
    echo -e "${RED}❌ $meta - 未設定${NC}"
    ((ERRORS++))
  fi
done
echo ""

# 3. コンテンツ品質チェック
echo "📝 3. コンテンツ品質"

# Considered Options の数
OPTIONS_COUNT=$(grep -c "^### " "$ADR_FILE" || echo 0)
if [ $OPTIONS_COUNT -ge 2 ]; then
  echo -e "${GREEN}✅ 検討オプション: ${OPTIONS_COUNT}個${NC}"
elif [ $OPTIONS_COUNT -eq 1 ]; then
  echo -e "${YELLOW}⚠️  検討オプション: 1個のみ（推奨: 2個以上）${NC}"
  ((WARNINGS++))
else
  echo -e "${RED}❌ 検討オプション: なし${NC}"
  ((ERRORS++))
fi

# 空セクションチェック
EMPTY_SECTIONS=$(grep -A 1 "^## " "$ADR_FILE" | grep -c "^$" || echo 0)
if [ $EMPTY_SECTIONS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  空のセクションが${EMPTY_SECTIONS}個あります${NC}"
  ((WARNINGS++))
fi

# 参照元の数
REFERENCES_COUNT=$(grep -c "^\[.*\](.*)$" "$ADR_FILE" || echo 0)
if [ $REFERENCES_COUNT -ge 3 ]; then
  echo -e "${GREEN}✅ 参照元: ${REFERENCES_COUNT}件${NC}"
elif [ $REFERENCES_COUNT -gt 0 ]; then
  echo -e "${YELLOW}⚠️  参照元: ${REFERENCES_COUNT}件（推奨: 3件以上）${NC}"
  ((WARNINGS++))
else
  echo -e "${YELLOW}⚠️  参照元: なし${NC}"
  ((WARNINGS++))
fi
echo ""

# 4. MADR形式準拠チェック
echo "📐 4. MADR形式準拠"
MADR_COMPLIANT=true

# タイトル形式（# で始まる）
if grep -q "^# " "$ADR_FILE"; then
  echo -e "${GREEN}✅ タイトル形式: OK${NC}"
else
  echo -e "${RED}❌ タイトル形式: NG（# で始まる見出しが必要）${NC}"
  MADR_COMPLIANT=false
  ((ERRORS++))
fi

# メタデータがリスト形式
if grep -q "^- Status:" "$ADR_FILE" && grep -q "^- Date:" "$ADR_FILE"; then
  echo -e "${GREEN}✅ メタデータ形式: OK${NC}"
else
  echo -e "${YELLOW}⚠️  メタデータ形式: 非標準${NC}"
  ((WARNINGS++))
fi
echo ""

# 5. チェックリスト進捗（存在する場合）
echo "☑️  5. チェックリスト進捗"

CHECKLIST_DIR="$(dirname $0)/../checklists"
if [ -d "$CHECKLIST_DIR" ]; then
  # 影響範囲分析
  if [ -f "$CHECKLIST_DIR/impact-analysis.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/impact-analysis.md" || echo 0)
    echo "  影響範囲分析: 0/$TOTAL 完了 (要対応)"
  fi

  # テストカバレッジ
  if [ -f "$CHECKLIST_DIR/test-coverage.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/test-coverage.md" || echo 0)
    echo "  テスト更新: 0/$TOTAL 完了 (要対応)"
  fi

  # ロールバック計画
  if [ -f "$CHECKLIST_DIR/rollback-plan.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/rollback-plan.md" || echo 0)
    echo "  ロールバック計画: 0/$TOTAL 完了 (要対応)"
  fi
else
  echo -e "${BLUE}ℹ️  チェックリストテンプレート未配置${NC}"
fi
echo ""

# 6. 総合評価
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 総合評価"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_ISSUES=$((ERRORS + WARNINGS))

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ 検証合格 - ADRの品質基準を満たしています${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  警告あり - ${WARNINGS}件の改善推奨項目があります${NC}"
  echo ""
  echo "推奨アクション:"
  echo "  - 参照元を追加（最低3件）"
  echo "  - 空のセクションを記入"
  echo "  - チェックリストを完了"
  exit 0
else
  echo -e "${RED}❌ 検証失敗 - ${ERRORS}件のエラー、${WARNINGS}件の警告${NC}"
  echo ""
  echo "必須対応:"
  echo "  - 必須セクションを全て記入"
  echo "  - メタデータを設定"
  echo "  - 最低2つのオプションを検討"
  exit 1
fi
