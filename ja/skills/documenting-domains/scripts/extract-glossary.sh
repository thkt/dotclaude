#!/bin/bash
# extract-glossary.sh - ドメイン用語抽出スクリプト

set -e

TARGET_DIR="${1:-.}"

echo "=== ドメイン用語抽出 ==="
echo "対象: $TARGET_DIR"
echo ""

# CamelCaseを分解する関数
split_camel_case() {
    echo "$1" | sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g'
}

# snake_caseを分解する関数
split_snake_case() {
    echo "$1" | tr '_' ' '
}

# 用語候補を抽出
extract_terms() {
    echo "### ドメイン用語候補"
    echo ""
    echo "| 用語 | 出現回数 | 種類 |"
    echo "|------|---------|------|"

    # クラス名から抽出
    local class_names=$(grep -roh --include="*.ts" --include="*.tsx" --include="*.py" -E '(class|interface)\s+[A-Z][a-zA-Z0-9]+' "$TARGET_DIR" 2>/dev/null | \
        grep -v node_modules | \
        grep -v __pycache__ | \
        awk '{print $2}' | \
        sort | uniq -c | sort -rn | head -20 || true)

    if [ -n "$class_names" ]; then
        echo "$class_names" | while read -r count name; do
            [ -n "$name" ] && echo "| \`$name\` | $count | Class/Interface |"
        done
    fi

    # 関数名から重要そうな用語を抽出
    local func_patterns=$(grep -roh --include="*.ts" --include="*.tsx" --include="*.py" -E '(function|def|async)\s+[a-z][a-zA-Z0-9]+' "$TARGET_DIR" 2>/dev/null | \
        grep -v node_modules | \
        grep -v __pycache__ | \
        awk '{print $2}' | \
        grep -E '^(get|set|create|update|delete|find|fetch|save|load|validate|process|handle|calculate|generate)' | \
        sort | uniq -c | sort -rn | head -15 || true)

    if [ -n "$func_patterns" ]; then
        echo "$func_patterns" | while read -r count name; do
            [ -n "$name" ] && echo "| \`$name\` | $count | Function |"
        done
    fi

    echo ""
}

# ビジネスロジック関連ファイルを検出
detect_business_logic() {
    echo "### ビジネスロジック関連ファイル"
    echo ""

    local found=false

    # Service/UseCase/Handler パターンを検索
    local business_files=$(find "$TARGET_DIR" \
        -type f \( -name "*Service*.ts" -o -name "*UseCase*.ts" -o -name "*Handler*.ts" \
                   -o -name "*service*.py" -o -name "*usecase*.py" -o -name "*handler*.py" \) \
        ! -path "*/node_modules/*" \
        ! -path "*/__pycache__/*" \
        ! -path "*/.git/*" \
        ! -name "*.test.*" \
        ! -name "*.spec.*" \
        2>/dev/null | head -20)

    if [ -n "$business_files" ]; then
        found=true
        echo "| ファイル | 種類 |"
        echo "|----------|------|"

        echo "$business_files" | while read -r file; do
            rel_file="${file#$TARGET_DIR/}"
            if [[ "$file" == *Service* ]] || [[ "$file" == *service* ]]; then
                kind="Service"
            elif [[ "$file" == *UseCase* ]] || [[ "$file" == *usecase* ]]; then
                kind="UseCase"
            elif [[ "$file" == *Handler* ]] || [[ "$file" == *handler* ]]; then
                kind="Handler"
            else
                kind="Business Logic"
            fi
            echo "| $rel_file | $kind |"
        done
        echo ""
    fi

    # ドメイン関連ディレクトリを検出
    echo "**ドメイン関連ディレクトリ:**"
    echo ""
    for dir in domain services usecases handlers controllers features modules; do
        if [ -d "$TARGET_DIR/$dir" ] || [ -d "$TARGET_DIR/src/$dir" ]; then
            found=true
            local target_dir=""
            [ -d "$TARGET_DIR/$dir" ] && target_dir="$TARGET_DIR/$dir"
            [ -d "$TARGET_DIR/src/$dir" ] && target_dir="$TARGET_DIR/src/$dir"

            local file_count=$(find "$target_dir" -type f \( -name "*.ts" -o -name "*.py" \) 2>/dev/null | wc -l | tr -d ' ')
            echo "✓ $dir/ ($file_count files)"
        fi
    done
    echo ""

    if [ "$found" = false ]; then
        echo "ビジネスロジック関連ファイルは検出されませんでした。"
        echo ""
    fi
}

# README/ドキュメントからドメイン情報を抽出
extract_from_docs() {
    echo "### ドキュメントからの情報"
    echo ""

    if [ -f "$TARGET_DIR/README.md" ]; then
        echo "**README.md からの概要:**"
        echo ""
        # 最初の段落を抽出（空行まで）
        head -50 "$TARGET_DIR/README.md" | sed -n '1,/^$/p' | head -10
        echo ""
    else
        echo "README.md が見つかりません。"
        echo ""
    fi
}

# メイン実行
extract_terms
detect_business_logic
extract_from_docs
