#!/bin/bash
# extract-entities.sh - Entity/Model Extraction Script

set -e

TARGET_DIR="${1:-.}"

echo "=== Entity Extraction ==="
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

# TypeScript/JavaScript entity detection
detect_ts_entities() {
    echo "### TypeScript/JavaScript Entities"
    echo ""

    local found=false

    # Priority search in model/entity directories
    local search_dirs=""
    for dir in models entities domain types schemas; do
        [ -d "$TARGET_DIR/$dir" ] && search_dirs="$search_dirs $TARGET_DIR/$dir"
        [ -d "$TARGET_DIR/src/$dir" ] && search_dirs="$search_dirs $TARGET_DIR/src/$dir"
    done

    # Search entire directory if no specific directories found
    [ -z "$search_dirs" ] && search_dirs="$TARGET_DIR"

    # Search for class definitions
    local classes=$(grep -rn --include="*.ts" --include="*.tsx" -E '^(export\s+)?(class|interface)\s+\w+' $search_dirs 2>/dev/null | grep -v node_modules | grep -v '.d.ts' | head -30 || true)

    if [ -n "$classes" ]; then
        found=true
        echo "| Kind | Name | File |"
        echo "|------|------|------|"

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

    # Prisma model detection
    if [ -f "$TARGET_DIR/prisma/schema.prisma" ]; then
        found=true
        echo "**Prisma Models:**"
        echo ""
        echo "| Model Name |"
        echo "|------------|"

        grep -E '^model\s+\w+' "$TARGET_DIR/prisma/schema.prisma" 2>/dev/null | while read -r line; do
            model_name=$(echo "$line" | awk '{print $2}')
            echo "| \`$model_name\` |"
        done
        echo ""
    fi

    # TypeORM Entity detection
    local typeorm=$(grep -rln --include="*.ts" '@Entity' "$TARGET_DIR" 2>/dev/null | grep -v node_modules | head -10 || true)
    if [ -n "$typeorm" ]; then
        found=true
        echo "**TypeORM Entities:**"
        echo ""
        echo "| Entity | File |"
        echo "|--------|------|"

        echo "$typeorm" | while read -r file; do
            entity_name=$(grep -E '@Entity|class\s+\w+' "$file" | grep 'class' | head -1 | grep -oE 'class\s+\w+' | awk '{print $2}')
            rel_file="${file#$TARGET_DIR/}"
            [ -n "$entity_name" ] && echo "| \`$entity_name\` | $rel_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "No TypeScript/JavaScript entities detected."
        echo ""
    fi
}

# Python entity detection
detect_python_entities() {
    echo "### Python Entities"
    echo ""

    local found=false

    # SQLAlchemy Model detection
    local sqlalchemy=$(grep -rln --include="*.py" 'Base\|declarative_base' "$TARGET_DIR" 2>/dev/null | head -10 || true)
    if [ -n "$sqlalchemy" ]; then
        local models=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*Base.*\)' "$TARGET_DIR" 2>/dev/null | grep -v __pycache__ | head -20 || true)
        if [ -n "$models" ]; then
            found=true
            echo "**SQLAlchemy Models:**"
            echo ""
            echo "| Model Name | File |"
            echo "|------------|------|"

            echo "$models" | while IFS= read -r line; do
                file=$(echo "$line" | cut -d: -f1)
                rel_file="${file#$TARGET_DIR/}"
                model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
                [ -n "$model_name" ] && echo "| \`$model_name\` | $rel_file |"
            done
            echo ""
        fi
    fi

    # Django Model detection
    local django=$(grep -rn --include="*.py" -E 'class\s+\w+\(.*models\.Model.*\)' "$TARGET_DIR" 2>/dev/null | grep -v __pycache__ | head -20 || true)
    if [ -n "$django" ]; then
        found=true
        echo "**Django Models:**"
        echo ""
        echo "| Model Name | File |"
        echo "|------------|------|"

        echo "$django" | while IFS= read -r line; do
            file=$(echo "$line" | cut -d: -f1)
            rel_file="${file#$TARGET_DIR/}"
            model_name=$(echo "$line" | grep -oE 'class\s+\w+' | awk '{print $2}')
            [ -n "$model_name" ] && echo "| \`$model_name\` | $rel_file |"
        done
        echo ""
    fi

    if [ "$found" = false ]; then
        echo "No Python entities detected."
        echo ""
    fi
}

# Main execution
detect_ts_entities
detect_python_entities
