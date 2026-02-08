#!/bin/zsh
# extract-modules.sh - Module Information Extraction Script

set -e

TARGET_DIR="${1:-.}"
OUTPUT_FORMAT="${2:-text}"  # text or json

echo "=== Module Information Extraction ==="
echo "Target: $TARGET_DIR"
echo ""

# Detect tree-sitter-analyzer
source "$(dirname "$0")/../../lib/detect-tree-sitter.sh"

# Collect source files (top 50)
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
    echo "No files found for analysis."
    exit 0
fi

TOTAL_CLASSES=0
TOTAL_FUNCTIONS=0
TOTAL_LINES=0

echo "### Module Analysis Results"
echo ""

if [ "$USE_TSA" = true ]; then
    echo "| File | Classes | Functions | Lines |"
    echo "|------|---------|-----------|-------|"

    for file in $SOURCE_FILES; do
        # Analyze with tree-sitter-analyzer (extract from JSON start position)
        result=$(tree-sitter-analyzer "$file" --structure --output-format json 2>/dev/null | sed -n '/^{/,$ p' || echo "{}")

        classes=$(echo "$result" | jq -r '.statistics.class_count // 0' 2>/dev/null || echo "0")
        functions=$(echo "$result" | jq -r '.statistics.method_count // 0' 2>/dev/null || echo "0")
        lines=$(echo "$result" | jq -r '.statistics.total_lines // 0' 2>/dev/null || echo "0")

        # Relative path
        rel_path="${file#$TARGET_DIR/}"

        echo "| $rel_path | $classes | $functions | $lines |"

        TOTAL_CLASSES=$((TOTAL_CLASSES + classes))
        TOTAL_FUNCTIONS=$((TOTAL_FUNCTIONS + functions))
        TOTAL_LINES=$((TOTAL_LINES + lines))
    done
else
    # Fallback: analyze with grep
    echo "| File | Lines |"
    echo "|------|-------|"

    for file in $SOURCE_FILES; do
        lines=$(wc -l < "$file" 2>/dev/null || echo "0")
        rel_path="${file#$TARGET_DIR/}"
        echo "| $rel_path | $lines |"
        TOTAL_LINES=$((TOTAL_LINES + lines))
    done
fi

echo ""
echo "### Summary"
echo "- Files analyzed: $(echo "$SOURCE_FILES" | wc -l | tr -d ' ')"
echo "- Total classes: $TOTAL_CLASSES"
echo "- Total functions: $TOTAL_FUNCTIONS"
echo "- Total lines: $TOTAL_LINES"
