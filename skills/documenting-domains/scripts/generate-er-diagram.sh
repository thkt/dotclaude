#!/bin/bash
# generate-er-diagram.sh - Conceptual Relationship Diagram (Mermaid ER) Generation Script

set -e

TARGET_DIR="${1:-.}"

echo "=== Conceptual Relationship Diagram Generation ==="
echo "Target: $TARGET_DIR"
echo ""

# Generate ER diagram from Prisma schema
generate_from_prisma() {
    local schema_file="$TARGET_DIR/prisma/schema.prisma"

    if [ ! -f "$schema_file" ]; then
        return 1
    fi

    echo "**Generated from Prisma Schema:**"
    echo ""
    echo '```mermaid'
    echo 'erDiagram'

    # Extract models and relations
    local current_model=""
    local in_model=false

    while IFS= read -r line; do
        # Model start
        if echo "$line" | grep -qE '^model\s+\w+'; then
            current_model=$(echo "$line" | awk '{print $2}')
            in_model=true
            echo "    $current_model {"
        # Model end
        elif [ "$in_model" = true ] && echo "$line" | grep -qE '^\}'; then
            echo "    }"
            in_model=false
        # Field
        elif [ "$in_model" = true ] && echo "$line" | grep -qE '^\s+\w+\s+\w+'; then
            field=$(echo "$line" | awk '{print $1}')
            field_type=$(echo "$line" | awk '{print $2}' | sed 's/[?@]//g')

            # Output only scalar types
            case "$field_type" in
                String|Int|Float|Boolean|DateTime|BigInt|Decimal|Json|Bytes)
                    echo "        $field_type $field"
                    ;;
            esac
        fi
    done < "$schema_file"

    # Extract relations
    echo ""
    local rel_model=""
    while IFS= read -r line; do
        if echo "$line" | grep -qE '^model\s+\w+'; then
            rel_model=$(echo "$line" | awk '{print $2}')
        elif echo "$line" | grep -qE '@relation'; then
            model_to=$(echo "$line" | awk '{print $2}' | sed 's/[][]//g' | sed 's/?//g')

            if [ -n "$rel_model" ] && [ -n "$model_to" ]; then
                if echo "$line" | grep -q '\[\]'; then
                    echo "    $rel_model ||--o{ $model_to : has"
                else
                    echo "    $rel_model ||--o| $model_to : has"
                fi
            fi
        fi
    done < "$schema_file" | sort -u

    echo '```'
    echo ""
    return 0
}

# Generate relationship diagram from TypeScript class/interface
generate_from_typescript() {
    echo "**Inferred from TypeScript:**"
    echo ""
    echo '```mermaid'
    echo 'erDiagram'

    # Detect entities
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

    # Infer reference relationships (whether other entities are referenced as types)
    if [ -n "$entities" ]; then
        for entity in $entities; do
            # Search for other entities referenced by this entity
            local refs=$(grep -rn --include="*.ts" -E "(class|interface)\s+$entity" "$TARGET_DIR" 2>/dev/null | \
                grep -v node_modules | head -1 | cut -d: -f1)

            if [ -n "$refs" ]; then
                for other in $entities; do
                    if [ "$entity" != "$other" ]; then
                        # Check if other entity is referenced in the file
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

# Main execution
echo "### Conceptual Relationship Diagram"
echo ""

if generate_from_prisma 2>/dev/null; then
    : # Successfully generated from Prisma
else
    generate_from_typescript
fi
