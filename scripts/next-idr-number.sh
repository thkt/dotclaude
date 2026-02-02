#!/bin/bash
# Purpose: Calculate next IDR number
# Input: IDR directory path (default: .)
# Output: Next number in 01 format
set -euo pipefail

idr_dir="${1:-.}"

if [ ! -d "$idr_dir" ]; then
  echo "01"
  exit 0
fi

max_num=0

while IFS= read -r -d '' f; do
  num=$(basename "$f" | sed -n 's/idr-0*\([0-9]\{1,\}\)\.md$/\1/p')
  if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -gt "$max_num" ]; then
    max_num="$num"
  fi
done < <(find "$idr_dir" -maxdepth 1 -name "idr-*.md" -print0 2>/dev/null)

printf "%02d\n" $((max_num + 1))
