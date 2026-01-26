#!/bin/bash
# Purpose: Detect source directory (src or app)
# Input: $1 = project type, $2 = project root (default: current directory)
# Output: src|app|.
set -euo pipefail

type="${1:-unknown}"
root="${2:-.}"

if [ -d "$root/src" ]; then
  echo "src"
elif [ "$type" = "node" ] && [ -d "$root/app" ]; then
  echo "app"
else
  echo "."
fi
