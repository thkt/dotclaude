#!/bin/bash
# ADR参照元収集スクリプト
# Usage: collect-references.sh "keywords"

set -euo pipefail

KEYWORDS="$1"
PROJECT_ROOT="${PROJECT_ROOT:-.}"

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 参照元収集: $KEYWORDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Markdown形式で出力
echo "## 参照元（自動収集）"
echo ""

# 1. プロジェクト内ドキュメント
echo "### プロジェクト内"
echo ""

# README.mdの検索
if [ -f "$PROJECT_ROOT/README.md" ]; then
  if grep -qi "$KEYWORDS" "$PROJECT_ROOT/README.md" 2>/dev/null; then
    echo "- [README.md](../README.md) - キーワード検出"
  fi
fi

# docs/配下の検索
if [ -d "$PROJECT_ROOT/docs" ]; then
  DOCS_FOUND=false
  while IFS= read -r file; do
    REL_PATH=$(echo "$file" | sed "s|^$PROJECT_ROOT/||")
    FILENAME=$(basename "$file" .md)
    echo "- [$FILENAME]($REL_PATH)"
    DOCS_FOUND=true
  done < <(find "$PROJECT_ROOT/docs" -name "*.md" -type f -exec grep -l "$KEYWORDS" {} \; 2>/dev/null | head -5)

  if [ "$DOCS_FOUND" = false ]; then
    echo "- （該当なし）"
  fi
else
  echo "- （該当なし）"
fi

echo ""

# 2. Issue・PR（gh CLI使用）
echo "### Issue・PR"
echo ""

if command -v gh &> /dev/null; then
  # GitHub CLI認証確認
  if gh auth status &> /dev/null; then
    # Issue検索
    ISSUES=$(gh issue list --search "$KEYWORDS" --state all --limit 3 \
      --json number,title,url \
      --jq '.[] | "- [Issue #\(.number): \(.title)](\(.url))"' 2>/dev/null || echo "")

    if [ -n "$ISSUES" ]; then
      echo "$ISSUES"
    fi

    # PR検索
    PRS=$(gh pr list --search "$KEYWORDS" --state all --limit 3 \
      --json number,title,url \
      --jq '.[] | "- [PR #\(.number): \(.title)](\(.url))"' 2>/dev/null || echo "")

    if [ -n "$PRS" ]; then
      echo "$PRS"
    fi

    if [ -z "$ISSUES" ] && [ -z "$PRS" ]; then
      echo "- （該当なし）"
    fi
  else
    echo "- （gh CLI未認証 - \`gh auth login\` を実行してください）"
  fi
else
  echo "- （gh CLIが未インストール）"
fi

echo ""

# 3. 外部リソーステンプレート
echo "### 外部リソース"
echo ""
echo "<!-- 以下を手動で追加してください -->"
echo "- [公式ドキュメント](https://)"
echo "- [参考記事](https://)"
echo "- [ベンチマーク結果](https://)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 参照元収集完了${NC}"
echo ""
echo -e "${YELLOW}💡 外部リソースセクションは手動で編集してください${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
