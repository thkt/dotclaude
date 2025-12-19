#!/bin/bash
# extract-types.sh - Type Definition Extraction Script

set -e

TARGET_DIR="${1:-.}"

echo "=== Type Definition Extraction ==="
echo "Target: $TARGET_DIR"
echo ""

# Check if tree-sitter-analyzer is available
if command -v tree-sitter-analyzer &> /dev/null; then
    USE_TSA=true
else
    USE_TSA=false
    echo "⚠️  tree-sitter-analyzer not found. Running in grep fallback mode."
    echo ""
fi

# TypeScript type definition extraction
extract_typescript_types() {
    echo "### TypeScript Type Definitions"
    echo ""

    # Search for interface definitions
    local interfaces=$(grep -rn --include="*.ts" --include="*.tsx" -E '^export\s+(interface|type)\s+\w+' "$TARGET_DIR" 2>/dev/null | head -30 || true)

    if [ -n "$interfaces" ]; then
        echo "**Interface/Type Definitions:**"
        echo ""
        echo "| Kind | Name | File:Line |"
        echo "|------|------|-----------|"

        echo "$interfaces" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            content=$(echo "$line" | cut -d: -f3-)

            # Extract kind (interface/type)
            kind=$(echo "$content" | grep -oE '(interface|type)' | head -1)

            # Extract name
            name=$(echo "$content" | grep -oE '(interface|type)\s+\w+' | awk '{print $2}' | head -1)

            [ -n "$name" ] && echo "| $kind | \`$name\` | $file_line |"
        done
        echo ""
    else
        echo "No TypeScript type definitions detected."
        echo ""
    fi

    # Zod schema detection
    local zod_schemas=$(grep -rn --include="*.ts" --include="*.tsx" -E 'z\.(object|string|number|boolean|array)\(' "$TARGET_DIR" 2>/dev/null | head -20 || true)

    if [ -n "$zod_schemas" ]; then
        echo "**Zod Schemas:**"
        echo ""
        echo "| Pattern | File:Line |"
        echo "|---------|-----------|"

        echo "$zod_schemas" | head -10 | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            echo "| Zod schema | $file_line |"
        done
        echo ""
    fi
}

# Python type definition extraction
extract_python_types() {
    echo "### Python Type Definitions"
    echo ""

    # Search for dataclass definitions
    local dataclasses=$(grep -rn --include="*.py" -B1 -E '@dataclass' "$TARGET_DIR" 2>/dev/null | grep 'class ' | head -20 || true)

    if [ -n "$dataclasses" ]; then
        echo "**Dataclass Definitions:**"
        echo ""
        echo "| Class Name | File |"
        echo "|------------|------|"

        echo "$dataclasses" | while IFS= read -r line; do
            file=$(echo "$line" | cut -d: -f1 | cut -d- -f1)
            class_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$class_name" ] && echo "| \`$class_name\` | $file |"
        done
        echo ""
    fi

    # Pydantic BaseModel detection
    local pydantic=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*BaseModel.*\)' "$TARGET_DIR" 2>/dev/null | head -20 || true)

    if [ -n "$pydantic" ]; then
        echo "**Pydantic Models:**"
        echo ""
        echo "| Model Name | File:Line |"
        echo "|------------|-----------|"

        echo "$pydantic" | while IFS= read -r line; do
            file_line=$(echo "$line" | cut -d: -f1-2)
            model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$model_name" ] && echo "| \`$model_name\` | $file_line |"
        done
        echo ""
    fi

    if [ -z "$dataclasses" ] && [ -z "$pydantic" ]; then
        echo "No Python type definitions detected."
        echo ""
    fi
}

# Function signature extraction (using tree-sitter-analyzer)
extract_function_signatures() {
    echo "### Function Signatures (Exported)"
    echo ""

    if [ "$USE_TSA" = true ]; then
        # Detect exported functions from TypeScript/JavaScript files
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
            echo "| Function | Parameters | Return | File |"
            echo "|----------|------------|--------|------|"

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
            echo "No files found for analysis."
            echo ""
        fi
    else
        # Fallback: search for export function using grep
        local exports=$(grep -rn --include="*.ts" --include="*.tsx" -E '^export\s+(async\s+)?function\s+\w+' "$TARGET_DIR" 2>/dev/null | head -20 || true)

        if [ -n "$exports" ]; then
            echo "| Function | File:Line |"
            echo "|----------|-----------|"

            echo "$exports" | while IFS= read -r line; do
                file_line=$(echo "$line" | cut -d: -f1-2)
                func_name=$(echo "$line" | grep -oE 'function\s+\w+' | awk '{print $2}')
                [ -n "$func_name" ] && echo "| \`$func_name\` | $file_line |"
            done
            echo ""
        else
            echo "No exported functions detected."
            echo ""
        fi
    fi
}

# Main execution
extract_typescript_types
extract_python_types
extract_function_signatures
