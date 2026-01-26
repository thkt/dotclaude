#!/bin/bash
# Purpose: Find project root by searching for config file
# Input: $1 = start directory, $2 = config filename (default: tsconfig.json)
# Output: Project root path (exit 1 if not found)
set -euo pipefail

dir="${1:-.}"
marker="${2:-tsconfig.json}"

# Resolve to absolute path
dir=$(cd "$dir" 2>/dev/null && pwd) || exit 1

while [ "$dir" != "/" ]; do
  if [ -f "$dir/$marker" ]; then
    echo "$dir"
    exit 0
  fi
  dir=$(dirname "$dir")
done

exit 1
