#!/bin/bash
# extract-types.sh - 型定義抽出スクリプト

set -e

TARGET_DIR="${1:-.}"

echo "=== 型定義抽出 ==="
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

# TypeScript型定義抽出
extract_typescript_types() {
    echo "### TypeScript型定義"
    echo ""

    # interface定義を検索
    local interfaces=$(grep -rn --include="*.ts" --include="*.tsx" -E '^export\s+(interface|type)\s+\w+' "$TARGET_DIR" 2>/dev/null | head -30 || true)

    if [ -n "$interfaces" ]; then
        echo "**Interface/Type定義:**"
        echo ""
        echo "| 種類 | 名前 | ファイル:行 |"
        echo "|------|------|-------------|"

        echo "$interfaces" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            content=$(echo "$line" | cut -d: -f3-)

            # 種類（interface/type）抽出
            kind=$(echo "$content" | grep -oE '(interface|type)' | head -1)

            # 名前抽出
            name=$(echo "$content" | grep -oE '(interface|type)\s+\w+' | awk '{print $2}' | head -1)

            [ -n "$name" ] && echo "| $kind | \`$name\` | $file_line |"
        done
        echo ""
    else
        echo "TypeScript型定義は検出されませんでした。"
        echo ""
    fi

    # Zodスキーマ検出
    local zod_schemas=$(grep -rn --include="*.ts" --include="*.tsx" -E 'z\.(object|string|number|boolean|array)\(' "$TARGET_DIR" 2>/dev/null | head -20 || true)

    if [ -n "$zod_schemas" ]; then
        echo "**Zodスキーマ:**"
        echo ""
        echo "| パターン | ファイル:行 |"
        echo "|----------|-------------|"

        echo "$zod_schemas" | head -10 | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            echo "| Zod schema | $file_line |"
        done
        echo ""
    fi
}

# Python型定義抽出
extract_python_types() {
    echo "### Python型定義"
    echo ""

    # dataclass定義を検索
    local dataclasses=$(grep -rn --include="*.py" -B1 -E '@dataclass' "$TARGET_DIR" 2>/dev/null | grep 'class ' | head -20 || true)

    if [ -n "$dataclasses" ]; then
        echo "**Dataclass定義:**"
        echo ""
        echo "| クラス名 | ファイル |"
        echo "|----------|----------|"

        echo "$dataclasses" | while IFS= read -r line; do
            file=$(echo "$line" | cut -d: -f1 | cut -d- -f1)
            class_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$class_name" ] && echo "| \`$class_name\` | $file |"
        done
        echo ""
    fi

    # Pydantic BaseModel検出
    local pydantic=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*BaseModel.*\)' "$TARGET_DIR" 2>/dev/null | head -20 || true)

    if [ -n "$pydantic" ]; then
        echo "**Pydantic Models:**"
        echo ""
        echo "| モデル名 | ファイル:行 |"
        echo "|----------|-------------|"

        echo "$pydantic" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$model_name" ] && echo "| \`$model_name\` | $file_line |"
        done
        echo ""
    fi

    if [ -z "$dataclasses" ] && [ -z "$pydantic" ]; then
        echo "Python型定義は検出されませんでした。"
        echo ""
    fi
}

# 関数シグネチャ抽出（tree-sitter-analyzer使用）
extract_function_signatures() {
    echo "### 関数シグネチャ（エクスポート）"
    echo ""

    if [ "$USE_TSA" = true ]; then
        # TypeScript/JavaScriptファイルからエクスポートされた関数を検出
        local source_files=$(find "$TARGET_DIR" \
            -type f \( -name "*.ts" -o -name "*.tsx" \) \
            ! -path "*/.git/*" \
            ! -path "*/node_modules/*" \
            ! -path "*/dist/*" \
            ! -name "*.test.*" \
            ! -name "*.spec.*" \
            ! -name "*.d.ts" \
            2>/dev/null | head -20)

        if [ -n "$source_files" ]; then
            echo "| 関数名 | 引数 | 戻り値 | ファイル |"
            echo "|--------|------|--------|----------|"

            for file in $source_files; do
                result=$(tree-sitter-analyzer "$file" --structure --output-format json 2>/dev/null | sed -n '/^{/,$ p' || echo "{}")
                methods=$(echo "$result" | jq -r '.methods[]? | "\(.name)|\(.parameters // "N/A")|\(.return_type // "N/A")"' 2>/dev/null || true)

                if [ -n "$methods" ]; then
                    rel_path="${file#$TARGET_DIR/}"
                    echo "$methods" | head -5 | while IFS='|' read -r name params ret; do
                        [ -n "$name" ] && echo "| \`$name\` | $params | $ret | $rel_path |"
                    done
                fi
            done
            echo ""
        else
            echo "解析対象ファイルが見つかりません。"
            echo ""
        fi
    else
        # フォールバック: grepでexport functionを検索
        local exports=$(grep -rn --include="*.ts" --include="*.tsx" -E '^export\s+(async\s+)?function\s+\w+' "$TARGET_DIR" 2>/dev/null | head -20 || true)

        if [ -n "$exports" ]; then
            echo "| 関数名 | ファイル:行 |"
            echo "|--------|-------------|"

            echo "$exports" | while IFS= read -r line; do
                file_line=$(echo "$line" | cut -d: -f1-2)
                func_name=$(echo "$line" | grep -oE 'function\s+\w+' | awk '{print $2}')
                [ -n "$func_name" ] && echo "| \`$func_name\` | $file_line |"
            done
            echo ""
        else
            echo "エクスポートされた関数は検出されませんでした。"
            echo ""
        fi
    fi
}

# メイン実行
extract_typescript_types
extract_python_types
extract_function_signatures
