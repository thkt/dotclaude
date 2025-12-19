#!/bin/bash
# detect-endpoints.sh - APIエンドポイント検出スクリプト

set -e

TARGET_DIR="${1:-.}"

echo "=== APIエンドポイント検出 ==="
echo "対象: $TARGET_DIR"
echo ""

# Express.js / Fastify / Hono エンドポイント検出
detect_node_endpoints() {
    echo "### Node.js APIエンドポイント"
    echo ""

    # Express/Fastify/Hono ルート定義を検索
    local patterns=(
        'app\.(get|post|put|patch|delete|options|head)\s*\('
        'router\.(get|post|put|patch|delete|options|head)\s*\('
        'fastify\.(get|post|put|patch|delete|options|head)\s*\('
    )

    local found=false

    for pattern in "${patterns[@]}"; do
        results=$(grep -rn --include="*.ts" --include="*.js" -E "$pattern" "$TARGET_DIR" 2>/dev/null | head -30 || true)
        if [ -n "$results" ]; then
            found=true
            echo "| メソッド | パス | ファイル:行 |"
            echo "|----------|------|-------------|"

            echo "$results" | while IFS= read -r line; do
                file_line=$(echo "$line" | cut -d: -f1-2)
                content=$(echo "$line" | cut -d: -f3-)

                # メソッド抽出
                method=$(echo "$content" | grep -oE '\.(get|post|put|patch|delete|options|head)' | tr -d '.' | tr '[:lower:]' '[:upper:]' | head -1)

                # パス抽出（引用符内の最初の文字列）
                path=$(echo "$content" | grep -oE "['\"][^'\"]+['\"]" | head -1 | tr -d "'\""  || echo "N/A")

                [ -n "$method" ] && echo "| $method | \`$path\` | $file_line |"
            done
            echo ""
        fi
    done

    # Next.js App Router API routes
    local app_routes=$(find "$TARGET_DIR" -path "*/app/api/*" -name "route.ts" -o -path "*/app/api/*" -name "route.js" 2>/dev/null | head -20)
    if [ -n "$app_routes" ]; then
        found=true
        echo "**Next.js App Router API Routes:**"
        echo ""
        echo "| エンドポイント | ファイル |"
        echo "|---------------|----------|"

        echo "$app_routes" | while read -r route_file; do
            # app/api/users/route.ts -> /api/users
            endpoint=$(echo "$route_file" | sed -E 's|.*/app(/api/.*)/(route\.(ts|js))|\1|')
            echo "| \`$endpoint\` | $route_file |"
        done
        echo ""
    fi

    # Next.js Pages Router API routes
    local pages_routes=$(find "$TARGET_DIR" -path "*/pages/api/*" \( -name "*.ts" -o -name "*.js" \) ! -name "*.d.ts" 2>/dev/null | head -20)
    if [ -n "$pages_routes" ]; then
        found=true
        echo "**Next.js Pages Router API Routes:**"
        echo ""
        echo "| エンドポイント | ファイル |"
        echo "|---------------|----------|"

        echo "$pages_routes" | while read -r route_file; do
            # pages/api/users.ts -> /api/users
            endpoint=$(echo "$route_file" | sed -E 's|.*/pages(/api/.*)\.(ts|js)|\1|')
            echo "| \`$endpoint\` | $route_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "Node.js APIエンドポイントは検出されませんでした。"
        echo ""
    fi
}

# Python (Flask/FastAPI/Django) エンドポイント検出
detect_python_endpoints() {
    echo "### Python APIエンドポイント"
    echo ""

    local found=false

    # Flask/FastAPI デコレータ検索
    local results=$(grep -rn --include="*.py" -E '@(app|router)\.(get|post|put|patch|delete|route)\s*\(' "$TARGET_DIR" 2>/dev/null | head -30 || true)

    if [ -n "$results" ]; then
        found=true
        echo "| メソッド | パス | ファイル:行 |"
        echo "|----------|------|-------------|"

        echo "$results" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            content=$(echo "$line" | cut -d: -f3-)

            # メソッド抽出
            method=$(echo "$content" | grep -oE '\.(get|post|put|patch|delete|route)' | tr -d '.' | tr '[:lower:]' '[:upper:]' | head -1)
            [ "$method" = "ROUTE" ] && method="ANY"

            # パス抽出
            path=$(echo "$content" | grep -oE "['\"][^'\"]+['\"]" | head -1 | tr -d "'\""  || echo "N/A")

            [ -n "$method" ] && echo "| $method | \`$path\` | $file_line |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "Python APIエンドポイントは検出されませんでした。"
        echo ""
    fi
}

# OpenAPI/Swagger 仕様検出
detect_openapi() {
    echo "### OpenAPI/Swagger仕様"
    echo ""

    local found=false

    for spec_file in openapi.yaml openapi.yml swagger.yaml swagger.yml openapi.json swagger.json; do
        if [ -f "$TARGET_DIR/$spec_file" ]; then
            found=true
            echo "✓ $spec_file が見つかりました"

            # OpenAPIバージョン検出
            if [[ "$spec_file" == *.yaml ]] || [[ "$spec_file" == *.yml ]]; then
                version=$(grep -E '^openapi:|^swagger:' "$TARGET_DIR/$spec_file" 2>/dev/null | head -1)
                [ -n "$version" ] && echo "  バージョン: $version"
            fi
        fi
    done

    if [ "$found" = false ]; then
        echo "OpenAPI/Swagger仕様は検出されませんでした。"
    fi
    echo ""
}

# メイン実行
detect_node_endpoints
detect_python_endpoints
detect_openapi
