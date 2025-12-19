#!/bin/bash
# extract-modules.sh - モジュール情報抽出スクリプト

set -e

TARGET_DIR="${1:-.}"
OUTPUT_FORMAT="${2:-text}"  # text or json

echo "=== モジュール情報抽出 ==="
echo "対象: $TARGET_DIR"
echo ""

# tree-sitter-analyzer が利用可能か確認
if command -v tree-sitter-analyzer &> /dev/null; then
    USE_TSA=true
else
    USE_TSA=false
    echo "⚠️  tree-sitter-analyzer が見つかりません。フォールバックモードで実行します。"
fi

# ソースファイル収集（上位50ファイル）
SOURCE_FILES=$(find "$TARGET_DIR" \
    -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rs" \) \
    ! -path "*/.git/*" \
    ! -path "*/node_modules/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/__pycache__/*" \
    ! -path "*/.venv/*" \
    ! -name "*.test.*" \
    ! -name "*.spec.*" \
    2>/dev/null | head -50)

if [ -z "$SOURCE_FILES" ]; then
    echo "解析対象ファイルが見つかりません。"
    exit 0
fi

TOTAL_CLASSES=0
TOTAL_FUNCTIONS=0
TOTAL_LINES=0

echo "### モジュール解析結果"
echo ""

if [ "$USE_TSA" = true ]; then
    echo "| ファイル | クラス数 | 関数数 | 行数 |"
    echo "|----------|---------|--------|------|"

    for file in $SOURCE_FILES; do
        # tree-sitter-analyzer で解析（JSONの開始位置から抽出）
        result=$(tree-sitter-analyzer "$file" --structure --output-format json 2>/dev/null | sed -n '/^{/,$ p' || echo "{}")

        classes=$(echo "$result" | jq -r '.statistics.class_count // 0' 2>/dev/null || echo "0")
        functions=$(echo "$result" | jq -r '.statistics.method_count // 0' 2>/dev/null || echo "0")
        lines=$(echo "$result" | jq -r '.statistics.total_lines // 0' 2>/dev/null || echo "0")

        # 相対パス
        rel_path="${file#$TARGET_DIR/}"

        echo "| $rel_path | $classes | $functions | $lines |"

        TOTAL_CLASSES=$((TOTAL_CLASSES + classes))
        TOTAL_FUNCTIONS=$((TOTAL_FUNCTIONS + functions))
        TOTAL_LINES=$((TOTAL_LINES + lines))
    done
else
    # フォールバック: grep で解析
    echo "| ファイル | 行数 |"
    echo "|----------|------|"

    for file in $SOURCE_FILES; do
        lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        rel_path="${file#$TARGET_DIR/}"
        echo "| $rel_path | $lines |"
        TOTAL_LINES=$((TOTAL_LINES + lines))
    done
fi

echo ""
echo "### 集計"
echo "- 解析ファイル数: $(echo "$SOURCE_FILES" | wc -l | tr -d ' ')"
echo "- 総クラス数: $TOTAL_CLASSES"
echo "- 総関数数: $TOTAL_FUNCTIONS"
echo "- 総行数: $TOTAL_LINES"
