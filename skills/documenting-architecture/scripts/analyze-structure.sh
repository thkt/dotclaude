#!/bin/zsh
# analyze-structure.sh - Directory structure analysis

set -e

TARGET_DIR="${1:-.}"
DEPTH="${2:-3}"

EXCLUDE_PATTERNS="node_modules|.git|dist|build|__pycache__|.venv|coverage|.next|.nuxt|.output|.cache|.turbo"

echo "=== Directory Structure Analysis ==="
echo "Target: $TARGET_DIR"
echo "Depth: $DEPTH"
echo ""

echo "### Directory Structure"
tree -L "$DEPTH" -I "$EXCLUDE_PATTERNS" --dirsfirst "$TARGET_DIR" 2>/dev/null || {
    echo "tree command not available. Alternative output:"
    find "$TARGET_DIR" -maxdepth "$DEPTH" -type d ! -path "*/.git/*" ! -path "*/node_modules/*" | sort
}
echo ""

echo "### File Statistics"
echo "Total files: $(find "$TARGET_DIR" -type f ! -path "*/.git/*" ! -path "*/node_modules/*" | wc -l | tr -d ' ')"
echo ""

echo "### Files by Language"
echo "TypeScript: $(find "$TARGET_DIR" \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo "JavaScript: $(find "$TARGET_DIR" \( -name "*.js" -o -name "*.jsx" \) ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo "Python: $(find "$TARGET_DIR" -name "*.py" ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo "Java: $(find "$TARGET_DIR" -name "*.java" ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo "Go: $(find "$TARGET_DIR" -name "*.go" ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo "Rust: $(find "$TARGET_DIR" -name "*.rs" ! -path "*/.git/*" ! -path "*/node_modules/*" 2>/dev/null | wc -l | tr -d ' ')"
echo ""

echo "### Package Manager/Config Files"
for config in package.json pubspec.yaml Cargo.toml go.mod pyproject.toml requirements.txt Gemfile build.gradle pom.xml; do
    if [ -f "$TARGET_DIR/$config" ]; then
        echo "✓ $config"
    fi
done
echo ""

echo "### Key Directories"
for dir in src app lib components pages features utils hooks types tests test spec __tests__; do
    if [ -d "$TARGET_DIR/$dir" ]; then
        count=$(find "$TARGET_DIR/$dir" -type f 2>/dev/null | wc -l | tr -d ' ')
        echo "✓ $dir/ ($count files)"
    fi
done
