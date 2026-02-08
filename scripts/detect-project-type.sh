#!/bin/zsh
# Purpose: Detect project type based on config files
# Input: Project root path (default: current directory)
# Output: node|rust|go|python|unknown
set -euo pipefail

root="${1:-.}"

if [ -f "$root/package.json" ]; then
  echo "node"
elif [ -f "$root/Cargo.toml" ]; then
  echo "rust"
elif [ -f "$root/go.mod" ]; then
  echo "go"
elif [ -f "$root/pyproject.toml" ]; then
  echo "python"
else
  echo "unknown"
fi
