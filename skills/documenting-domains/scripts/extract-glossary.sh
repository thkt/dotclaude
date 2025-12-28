#!/bin/bash
# extract-glossary.sh - Domain Terms Extraction Script

set -e

TARGET_DIR="${1:-.}"

echo "=== Domain Terms Extraction ==="
echo "Target: $TARGET_DIR"
echo ""

# Function to split CamelCase
split_camel_case() {
    echo "$1" | sed 's/\([a-z]\)\([A-Z]\)/\1 \2/g'
}

# Function to split snake_case
split_snake_case() {
    echo "$1" | tr '_' ' '
}

# Extract term candidates
extract_terms() {
    echo "### Domain Term Candidates"
    echo ""
    echo "| Term | Occurrences | Kind |"
    echo "| --- | --- | --- |"

    # Extract from class names
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

    # Extract important terms from function names
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

# Detect business logic related files
detect_business_logic() {
    echo "### Business Logic Files"
    echo ""

    local found=false

    # Search for Service/UseCase/Handler patterns
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
        echo "| File | Kind |"
        echo "|------|------|"

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

    # Detect domain-related directories
    echo "**Domain-related Directories:**"
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
        echo "No business logic files detected."
        echo ""
    fi
}

# Extract domain info from README/docs
extract_from_docs() {
    echo "### Information from Documentation"
    echo ""

    if [ -f "$TARGET_DIR/README.md" ]; then
        echo "**Overview from README.md:**"
        echo ""
        # Extract first paragraph (up to empty line)
        head -50 "$TARGET_DIR/README.md" | sed -n '1,/^$/p' | head -10
        echo ""
    else
        echo "README.md not found."
        echo ""
    fi
}

# Main execution
extract_terms
detect_business_logic
extract_from_docs
