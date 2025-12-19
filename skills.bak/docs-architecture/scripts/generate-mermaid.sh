#!/bin/bash
# generate-mermaid.sh - Mermaid図生成スクリプト

set -e

TARGET_DIR="${1:-.}"
DIAGRAM_TYPE="${2:-module}"  # module or dependency

echo "=== Mermaid図生成 ==="
echo "対象: $TARGET_DIR"
echo "図の種類: $DIAGRAM_TYPE"
echo ""

# 主要ディレクトリの検出
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
    echo "### モジュール関係図"
    echo ""
    echo '```mermaid'
    echo 'graph TB'

    # ディレクトリをノードとして出力
    for dir in $DIRS; do
        # ディレクトリ名を大文字に変換（Mermaidノード名用）
        node_name=$(echo "$dir" | tr '[:lower:]' '[:upper:]')
        echo "    ${node_name}[${dir}/]"
    done

    echo ""

    # 基本的な依存関係の推測
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
    echo "### 外部依存関係図"
    echo ""

    # package.json から依存関係を抽出
    if [ -f "$TARGET_DIR/package.json" ]; then
        echo '```mermaid'
        echo 'graph LR'
        echo '    subgraph "プロジェクト"'
        echo '        PROJECT[src/]'
        echo '    end'
        echo ''
        echo '    subgraph "主要依存"'

        # 主要な依存関係を抽出（上位10個）
        deps=$(jq -r '.dependencies // {} | keys[]' "$TARGET_DIR/package.json" 2>/dev/null | head -10)
        for dep in $deps; do
            # パッケージ名をノード名に変換（特殊文字除去）
            node_name=$(echo "$dep" | tr -d '@/-' | tr '[:lower:]' '[:upper:]')
            echo "        ${node_name}[${dep}]"
        done

        echo '    end'
        echo ''

        # 依存関係の接続
        for dep in $deps; do
            node_name=$(echo "$dep" | tr -d '@/-' | tr '[:lower:]' '[:upper:]')
            echo "    PROJECT --> ${node_name}"
        done

        echo '```'
    else
        echo "package.json が見つかりません。"
    fi
fi
