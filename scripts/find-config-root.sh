#!/bin/bash
# Purpose: Find project root by searching for config file(s)
# Input: $1 = start directory, $2+ = config filenames (default: tsconfig.json)
# Output: Project root path (exit 1 if not found)
set -euo pipefail

dir="${1:-.}"
shift
markers=("${@:-tsconfig.json}")
[ ${#markers[@]} -eq 0 ] && markers=(tsconfig.json)

# Resolve to absolute path
dir=$(cd "$dir" 2>/dev/null && pwd) || exit 1

while [ "$dir" != "/" ]; do
  for marker in "${markers[@]}"; do
    if [ -f "$dir/$marker" ]; then
      echo "$dir"
      exit 0
    fi
  done
  dir=$(dirname "$dir")
done

exit 1
