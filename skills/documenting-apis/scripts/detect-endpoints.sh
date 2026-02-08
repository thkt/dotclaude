#!/bin/zsh
# detect-endpoints.sh - API Endpoint Detection Script

set -e

TARGET_DIR="${1:-.}"

echo "=== API Endpoint Detection ==="
echo "Target: $TARGET_DIR"
echo ""

# Express.js / Fastify / Hono endpoint detection
detect_node_endpoints() {
    echo "### Node.js API Endpoints"
    echo ""

    # Search for Express/Fastify/Hono route definitions
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
            echo "| Method | Path | File:Line |"
            echo "|--------|------|-----------|"

            echo "$results" | while IFS= read -r line; do
                file_line=$(echo "$line" | cut -d: -f1-2)
                content=$(echo "$line" | cut -d: -f3-)

                # Extract method
                method=$(echo "$content" | grep -oE '\.(get|post|put|patch|delete|options|head)' | tr -d '.' | tr '[:lower:]' '[:upper:]' | head -1)

                # Extract path (first string in quotes)
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
        echo "| Endpoint | File |"
        echo "|----------|------|"

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
        echo "| Endpoint | File |"
        echo "|----------|------|"

        echo "$pages_routes" | while read -r route_file; do
            # pages/api/users.ts -> /api/users
            endpoint=$(echo "$route_file" | sed -E 's|.*/pages(/api/.*)\.(ts|js)|\1|')
            echo "| \`$endpoint\` | $route_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "No Node.js API endpoints detected."
        echo ""
    fi
}

# Python (Flask/FastAPI/Django) endpoint detection
detect_python_endpoints() {
    echo "### Python API Endpoints"
    echo ""

    local found=false

    # Flask/FastAPI decorator search
    local results=$(grep -rn --include="*.py" -E '@(app|router)\.(get|post|put|patch|delete|route)\s*\(' "$TARGET_DIR" 2>/dev/null | head -30 || true)

    if [ -n "$results" ]; then
        found=true
        echo "| Method | Path | File:Line |"
        echo "|--------|------|-----------|"

        echo "$results" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            content=$(echo "$line" | cut -d: -f3-)

            # Extract method
            method=$(echo "$content" | grep -oE '\.(get|post|put|patch|delete|route)' | tr -d '.' | tr '[:lower:]' '[:upper:]' | head -1)
            [ "$method" = "ROUTE" ] && method="ANY"

            # Extract path
            path=$(echo "$content" | grep -oE "['\"][^'\"]+['\"]" | head -1 | tr -d "'\""  || echo "N/A")

            [ -n "$method" ] && echo "| $method | \`$path\` | $file_line |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "No Python API endpoints detected."
        echo ""
    fi
}

# OpenAPI/Swagger spec detection
detect_openapi() {
    echo "### OpenAPI/Swagger Specification"
    echo ""

    local found=false

    for spec_file in openapi.yaml openapi.yml swagger.yaml swagger.yml openapi.json swagger.json; do
        if [ -f "$TARGET_DIR/$spec_file" ]; then
            found=true
            echo "✓ $spec_file found"

            # OpenAPI version detection
            if [[ "$spec_file" == *.yaml ]] || [[ "$spec_file" == *.yml ]]; then
                version=$(grep -E '^openapi:|^swagger:' "$TARGET_DIR/$spec_file" 2>/dev/null | head -1)
                [ -n "$version" ] && echo "  Version: $version"
            fi
        fi
    done

    if [ "$found" = false ]; then
        echo "No OpenAPI/Swagger specification detected."
    fi
    echo ""
}

# Main execution
detect_node_endpoints
detect_python_endpoints
detect_openapi
