#!/bin/bash
# generate-mermaid.sh - Mermaid Diagram Generation Script

set -e

TARGET_DIR="${1:-.}"
DIAGRAM_TYPE="${2:-module}"  # module or dependency

echo "=== Mermaid Diagram Generation ==="
echo "Target: $TARGET_DIR"
echo "Diagram type: $DIAGRAM_TYPE"
echo ""

# Detect key directories
detect_directories() {
    local dirs=()
    for dir in src app lib components pages features utils hooks types services api models controllers views; do
        if [ -d "$TARGET_DIR/$dir" ]; then
            dirs+=("$dir")
        fi
    done
    echo "${dirs[@]}"
}

DIRS=$(detect_directories)

if [ "$DIAGRAM_TYPE" = "module" ]; then
    echo "### Module Relationship Diagram"
    echo ""
    echo '```mermaid'
    echo 'graph TB'

    # Output directories as nodes
    for dir in $DIRS; do
        # Convert directory name to uppercase (for Mermaid node name)
        node_name=$(echo "$dir" | tr '[:lower:]' '[:upper:]')
        echo "    ${node_name}[${dir}/]"
    done

    echo ""

    # Infer basic dependencies
    # components -> utils, hooks
    if [[ " $DIRS " =~ " components " ]]; then
        [[ " $DIRS " =~ " utils " ]] && echo "    COMPONENTS --> UTILS"
        [[ " $DIRS " =~ " hooks " ]] && echo "    COMPONENTS --> HOOKS"
        [[ " $DIRS " =~ " types " ]] && echo "    COMPONENTS --> TYPES"
    fi

    # pages/app -> components, features
    if [[ " $DIRS " =~ " pages " ]] || [[ " $DIRS " =~ " app " ]]; then
        page_node=$([[ " $DIRS " =~ " app " ]] && echo "APP" || echo "PAGES")
        [[ " $DIRS " =~ " components " ]] && echo "    ${page_node} --> COMPONENTS"
        [[ " $DIRS " =~ " features " ]] && echo "    ${page_node} --> FEATURES"
    fi

    # features -> components, services
    if [[ " $DIRS " =~ " features " ]]; then
        [[ " $DIRS " =~ " components " ]] && echo "    FEATURES --> COMPONENTS"
        [[ " $DIRS " =~ " services " ]] && echo "    FEATURES --> SERVICES"
        [[ " $DIRS " =~ " api " ]] && echo "    FEATURES --> API"
    fi

    # services -> models, api
    if [[ " $DIRS " =~ " services " ]]; then
        [[ " $DIRS " =~ " models " ]] && echo "    SERVICES --> MODELS"
        [[ " $DIRS " =~ " api " ]] && echo "    SERVICES --> API"
    fi

    # lib -> utils
    if [[ " $DIRS " =~ " lib " ]]; then
        [[ " $DIRS " =~ " utils " ]] && echo "    LIB --> UTILS"
    fi

    echo '```'

elif [ "$DIAGRAM_TYPE" = "dependency" ]; then
    echo "### External Dependency Diagram"
    echo ""

    # Extract dependencies from package.json
    if [ -f "$TARGET_DIR/package.json" ]; then
        echo '```mermaid'
        echo 'graph LR'
        echo '    subgraph "Project"'
        echo '        PROJECT[src/]'
        echo '    end'
        echo ''
        echo '    subgraph "Main Dependencies"'

        # Extract main dependencies (top 10)
        deps=$(jq -r '.dependencies // {} | keys[]' "$TARGET_DIR/package.json" 2>/dev/null | head -10)
        for dep in $deps; do
            # Convert package name to node name (remove special characters)
            node_name=$(echo "$dep" | tr -d '@/-' | tr '[:lower:]' '[:upper:]')
            echo "        ${node_name}[${dep}]"
        done

        echo '    end'
        echo ''

        # Connect dependencies
        for dep in $deps; do
            node_name=$(echo "$dep" | tr -d '@/-' | tr '[:lower:]' '[:upper:]')
            echo "    PROJECT --> ${node_name}"
        done

        echo '```'
    else
        echo "package.json not found."
    fi
fi
