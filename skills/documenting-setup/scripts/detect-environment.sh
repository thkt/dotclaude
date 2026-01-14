#!/bin/bash
# detect-environment.sh - Environment Configuration Detection Script

set -e

TARGET_DIR="${1:-.}"

echo "=== Environment Configuration Detection ==="
echo "Target: $TARGET_DIR"
echo ""

# Package manager detection
echo "### Package Manager"
echo ""

detect_package_manager() {
    local detected=""

    # Node.js
    if [ -f "$TARGET_DIR/package.json" ]; then
        if [ -f "$TARGET_DIR/pnpm-lock.yaml" ]; then
            detected="pnpm"
        elif [ -f "$TARGET_DIR/yarn.lock" ]; then
            detected="yarn"
        elif [ -f "$TARGET_DIR/bun.lockb" ]; then
            detected="bun"
        else
            detected="npm"
        fi
        echo "✓ Node.js ($detected)"

        # Node.js version detection
        if [ -f "$TARGET_DIR/.nvmrc" ]; then
            echo "  Version: $(cat "$TARGET_DIR/.nvmrc")"
        elif [ -f "$TARGET_DIR/.node-version" ]; then
            echo "  Version: $(cat "$TARGET_DIR/.node-version")"
        fi
    fi

    # Python
    if [ -f "$TARGET_DIR/pyproject.toml" ]; then
        echo "✓ Python (pyproject.toml)"
        if [ -f "$TARGET_DIR/.python-version" ]; then
            echo "  Version: $(cat "$TARGET_DIR/.python-version")"
        fi
    elif [ -f "$TARGET_DIR/requirements.txt" ]; then
        echo "✓ Python (requirements.txt)"
    elif [ -f "$TARGET_DIR/Pipfile" ]; then
        echo "✓ Python (Pipfile)"
    fi

    # Rust
    if [ -f "$TARGET_DIR/Cargo.toml" ]; then
        echo "✓ Rust (Cargo.toml)"
        if [ -f "$TARGET_DIR/rust-toolchain.toml" ]; then
            echo "  Toolchain: $(grep 'channel' "$TARGET_DIR/rust-toolchain.toml" 2>/dev/null | head -1)"
        fi
    fi

    # Go
    if [ -f "$TARGET_DIR/go.mod" ]; then
        echo "✓ Go (go.mod)"
        go_version=$(grep '^go ' "$TARGET_DIR/go.mod" 2>/dev/null | awk '{print $2}')
        [ -n "$go_version" ] && echo "  Version: $go_version"
    fi

    # Flutter/Dart
    if [ -f "$TARGET_DIR/pubspec.yaml" ]; then
        echo "✓ Flutter/Dart (pubspec.yaml)"
    fi

    # Ruby
    if [ -f "$TARGET_DIR/Gemfile" ]; then
        echo "✓ Ruby (Gemfile)"
        if [ -f "$TARGET_DIR/.ruby-version" ]; then
            echo "  Version: $(cat "$TARGET_DIR/.ruby-version")"
        fi
    fi

    # Java
    if [ -f "$TARGET_DIR/pom.xml" ]; then
        echo "✓ Java (Maven)"
    elif [ -f "$TARGET_DIR/build.gradle" ] || [ -f "$TARGET_DIR/build.gradle.kts" ]; then
        echo "✓ Java/Kotlin (Gradle)"
    fi

    # asdf
    if [ -f "$TARGET_DIR/.tool-versions" ]; then
        echo ""
        echo "**asdf configuration (.tool-versions):**"
        cat "$TARGET_DIR/.tool-versions" | while read line; do
            echo "  $line"
        done
    fi
}

detect_package_manager
echo ""

# Environment variables detection
echo "### Environment Variables"
echo ""

detect_env_vars() {
    local env_files=(".env.example" ".env.sample" ".env.template" ".env.local.example")
    local found=false

    for env_file in "${env_files[@]}"; do
        if [ -f "$TARGET_DIR/$env_file" ]; then
            found=true
            echo "**$env_file:**"
            echo ""
            echo "| Variable Name | Default Value | Description |"
            echo "|---------------|---------------|-------------|"
            grep -v '^#' "$TARGET_DIR/$env_file" | grep -v '^$' | while IFS='=' read -r key value; do
                if [ -n "$key" ]; then
                    # Extract description from previous comment line
                    desc=""
                    echo "| \`$key\` | \`${value:-Not set}\` | $desc |"
                fi
            done
            echo ""
        fi
    done

    if [ "$found" = false ]; then
        echo "No environment variable files found."
        echo "(Recommended: Add .env.example, .env.sample, etc.)"
    fi
}

detect_env_vars
echo ""

# Container configuration detection
echo "### Container Configuration"
echo ""

detect_containers() {
    local found=false

    if [ -f "$TARGET_DIR/Dockerfile" ]; then
        found=true
        echo "✓ Dockerfile"
        base_image=$(grep '^FROM' "$TARGET_DIR/Dockerfile" | head -1 | awk '{print $2}')
        [ -n "$base_image" ] && echo "  Base image: $base_image"
    fi

    if [ -f "$TARGET_DIR/docker-compose.yml" ] || [ -f "$TARGET_DIR/docker-compose.yaml" ]; then
        found=true
        local compose_file
        [ -f "$TARGET_DIR/docker-compose.yml" ] && compose_file="docker-compose.yml"
        [ -f "$TARGET_DIR/docker-compose.yaml" ] && compose_file="docker-compose.yaml"
        echo "✓ $compose_file"

        # Service list
        if command -v yq &> /dev/null; then
            services=$(yq '.services | keys' "$TARGET_DIR/$compose_file" 2>/dev/null | tr -d '[]"' | tr ',' '\n')
            if [ -n "$services" ]; then
                echo "  Services:"
                echo "$services" | while read svc; do
                    [ -n "$svc" ] && echo "    - $svc"
                done
            fi
        fi
    fi

    if [ -d "$TARGET_DIR/.devcontainer" ]; then
        found=true
        echo "✓ Dev Container (.devcontainer/)"
    fi

    if [ "$found" = false ]; then
        echo "No container configuration detected."
    fi
}

detect_containers
echo ""

# Startup commands detection
echo "### Startup Commands"
echo ""

detect_scripts() {
    # package.json scripts
    if [ -f "$TARGET_DIR/package.json" ]; then
        echo "**npm/yarn/pnpm scripts:**"
        echo ""
        echo "| Command | Description |"
        echo "|---------|-------------|"

        if command -v jq &> /dev/null; then
            jq -r '.scripts // {} | to_entries[] | "| `\(.key)` | `\(.value | .[0:50])` |"' "$TARGET_DIR/package.json" 2>/dev/null | head -15
        else
            echo "jq is not installed, unable to parse scripts"
        fi
        echo ""
    fi

    # Makefile
    if [ -f "$TARGET_DIR/Makefile" ]; then
        echo "**Makefile targets:**"
        echo ""
        echo "| Target |"
        echo "|--------|"
        grep -E '^[a-zA-Z_-]+:' "$TARGET_DIR/Makefile" | sed 's/:.*//' | head -10 | while read target; do
            echo "| \`make $target\` |"
        done
        echo ""
    fi
}

detect_scripts
