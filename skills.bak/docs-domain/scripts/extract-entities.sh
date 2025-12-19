#!/bin/bash
# extract-entities.sh - エンティティ/モデル抽出スクリプト

set -e

TARGET_DIR="${1:-.}"

echo "=== エンティティ抽出 ==="
echo "対象: $TARGET_DIR"
echo ""

# tree-sitter-analyzer が利用可能か確認
if command -v tree-sitter-analyzer &> /dev/null; then
    USE_TSA=true
else
    USE_TSA=false
    echo "⚠️  tree-sitter-analyzer が見つかりません。grepフォールバックモードで実行します。"
    echo ""
fi

# TypeScript/JavaScript エンティティ検出
detect_ts_entities() {
    echo "### TypeScript/JavaScript エンティティ"
    echo ""

    local found=false

    # モデル/エンティティディレクトリを優先検索
    local search_dirs=""
    for dir in models entities domain types schemas; do
        [ -d "$TARGET_DIR/$dir" ] && search_dirs="$search_dirs $TARGET_DIR/$dir"
        [ -d "$TARGET_DIR/src/$dir" ] && search_dirs="$search_dirs $TARGET_DIR/src/$dir"
    done

    # ディレクトリがなければ全体検索
    [ -z "$search_dirs" ] && search_dirs="$TARGET_DIR"

    # class定義を検索
    local classes=$(grep -rn --include="*.ts" --include="*.tsx" -E '^(export\s+)?(class|interface)\s+\w+' $search_dirs 2>/dev/null | grep -v node_modules | grep -v '.d.ts' | head -30 || true)

    if [ -n "$classes" ]; then
        found=true
        echo "| 種類 | 名前 | ファイル |"
        echo "|------|------|----------|"

        echo "$classes" | while IFS= read -r line; do
            file=$(echo "$line" | cut -d: -f1)
            rel_file="${file#$TARGET_DIR/}"
            content=$(echo "$line" | cut -d: -f3-)

            kind=$(echo "$content" | grep -oE '(class|interface)' | head -1)
            name=$(echo "$content" | grep -oE '(class|interface)\s+\w+' | awk '{print $2}' | head -1)

            [ -n "$name" ] && echo "| $kind | \`$name\` | $rel_file |"
        done
        echo ""
    fi

    # Prisma モデル検出
    if [ -f "$TARGET_DIR/prisma/schema.prisma" ]; then
        found=true
        echo "**Prisma Models:**"
        echo ""
        echo "| モデル名 |"
        echo "|----------|"

        grep -E '^model\s+\w+' "$TARGET_DIR/prisma/schema.prisma" 2>/dev/null | while read -r line; do
            model_name=$(echo "$line" | awk '{print $2}')
            echo "| \`$model_name\` |"
        done
        echo ""
    fi

    # TypeORM Entity検出
    local typeorm=$(grep -rln --include="*.ts" '@Entity' "$TARGET_DIR" 2>/dev/null | grep -v node_modules | head -10 || true)
    if [ -n "$typeorm" ]; then
        found=true
        echo "**TypeORM Entities:**"
        echo ""
        echo "| エンティティ | ファイル |"
        echo "|-------------|----------|"

        echo "$typeorm" | while read -r file; do
            entity_name=$(grep -E '@Entity|class\s+\w+' "$file" | grep 'class' | head -1 | grep -oE 'class\s+\w+' | awk '{print $2}')
            rel_file="${file#$TARGET_DIR/}"
            [ -n "$entity_name" ] && echo "| \`$entity_name\` | $rel_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "TypeScript/JavaScriptエンティティは検出されませんでした。"
        echo ""
    fi
}

# Python エンティティ検出
detect_python_entities() {
    echo "### Python エンティティ"
    echo ""

    local found=false

    # SQLAlchemy Model検出
    local sqlalchemy=$(grep -rln --include="*.py" 'Base\|declarative_base' "$TARGET_DIR" 2>/dev/null | head -10 || true)
    if [ -n "$sqlalchemy" ]; then
        local models=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*Base.*\)' "$TARGET_DIR" 2>/dev/null | grep -v __pycache__ | head -20 || true)
        if [ -n "$models" ]; then
            found=true
            echo "**SQLAlchemy Models:**"
            echo ""
            echo "| モデル名 | ファイル |"
            echo "|----------|----------|"

            echo "$models" | while IFS= read -r line; do
                file=$(echo "$line" | cut -d: -f1)
                rel_file="${file#$TARGET_DIR/}"
                model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
                [ -n "$model_name" ] && echo "| \`$model_name\` | $rel_file |"
            done
            echo ""
        fi
    fi

    # Django Model検出
    local django=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*models\.Model.*\)' "$TARGET_DIR" 2>/dev/null | grep -v __pycache__ | head -20 || true)
    if [ -n "$django" ]; then
        found=true
        echo "**Django Models:**"
        echo ""
        echo "| モデル名 | ファイル |"
        echo "|----------|----------|"

        echo "$django" | while IFS= read -r line; do
            file=$(echo "$line" | cut -d: -f1)
            rel_file="${file#$TARGET_DIR/}"
            model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$model_name" ] && echo "| \`$model_name\` | $rel_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "Pythonエンティティは検出されませんでした。"
        echo ""
    fi
}

# メイン実行
detect_ts_entities
detect_python_entities
