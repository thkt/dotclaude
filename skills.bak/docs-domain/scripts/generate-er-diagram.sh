#!/bin/bash
# generate-er-diagram.sh - 概念関係図（Mermaid ER図）生成スクリプト

set -e

TARGET_DIR="${1:-.}"

echo "=== 概念関係図生成 ==="
echo "対象: $TARGET_DIR"
echo ""

# Prisma schemaからER図を生成
generate_from_prisma() {
    local schema_file="$TARGET_DIR/prisma/schema.prisma"

    if [ ! -f "$schema_file" ]; then
        return 1
    fi

    echo "**Prisma Schema から生成:**"
    echo ""
    echo '```mermaid'
    echo 'erDiagram'

    # モデルとリレーションを抽出
    local current_model=""
    local in_model=false

    while IFS= read -r line; do
        # モデル開始
        if echo "$line" | grep -qE '^model\s+\w+'; then
            current_model=$(echo "$line" | awk '{print $2}')
            in_model=true
            echo "    $current_model {"
        # モデル終了
        elif [ "$in_model" = true ] && echo "$line" | grep -qE '^\}'; then
            echo "    }"
            in_model=false
        # フィールド
        elif [ "$in_model" = true ] && echo "$line" | grep -qE '^\s+\w+\s+\w+'; then
            field=$(echo "$line" | awk '{print $1}')
            field_type=$(echo "$line" | awk '{print $2}' | sed 's/[?@]//g')

            # スカラー型のみ出力
            case "$field_type" in
                String|Int|Float|Boolean|DateTime|BigInt|Decimal|Json|Bytes)
                    echo "        $field_type $field"
                    ;;
            esac
        fi
    done < "$schema_file"

    # リレーションを抽出
    echo ""
    while IFS= read -r line; do
        if echo "$line" | grep -qE '@relation'; then
            # リレーションフィールドを含む行からモデル名を抽出
            model_from=$(grep -B20 "$line" "$schema_file" | grep -E '^model\s+' | tail -1 | awk '{print $2}')
            model_to=$(echo "$line" | awk '{print $2}' | sed 's/[][]//g' | sed 's/?//g')

            if [ -n "$model_from" ] && [ -n "$model_to" ]; then
                # 配列リレーションかどうかで関係を決定
                if echo "$line" | grep -q '\[\]'; then
                    echo "    $model_from ||--o{ $model_to : has"
                else
                    echo "    $model_from ||--o| $model_to : has"
                fi
            fi
        fi
    done < "$schema_file" | sort -u

    echo '```'
    echo ""
    return 0
}

# TypeScript class/interfaceから関係図を生成
generate_from_typescript() {
    echo "**TypeScript から推測:**"
    echo ""
    echo '```mermaid'
    echo 'erDiagram'

    # エンティティを検出
    local entities=$(grep -roh --include="*.ts" -E '(class|interface)\s+[A-Z][a-zA-Z0-9]+' "$TARGET_DIR" 2>/dev/null | \
        grep -v node_modules | \
        awk '{print $2}' | \
        sort -u | head -15)

    if [ -n "$entities" ]; then
        echo "$entities" | while read -r entity; do
            echo "    $entity {"
            echo "        string id"
            echo "    }"
        done
    fi

    # 参照関係を推測（型として他のエンティティを参照しているか）
    if [ -n "$entities" ]; then
        for entity in $entities; do
            # このエンティティが参照している他のエンティティを検索
            local refs=$(grep -rn --include="*.ts" -E "(class|interface)\s+$entity" "$TARGET_DIR" 2>/dev/null | \
                grep -v node_modules | head -1 | cut -d: -f1)

            if [ -n "$refs" ]; then
                for other in $entities; do
                    if [ "$entity" != "$other" ]; then
                        # ファイル内で他のエンティティを参照しているか
                        if grep -q "$other" "$refs" 2>/dev/null; then
                            echo "    $entity ||--o| $other : references"
                        fi
                    fi
                done
            fi
        done | sort -u | head -20
    fi

    echo '```'
    echo ""
}

# メイン実行
echo "### 概念関係図"
echo ""

if generate_from_prisma 2>/dev/null; then
    : # Prismaから生成成功
else
    generate_from_typescript
fi
