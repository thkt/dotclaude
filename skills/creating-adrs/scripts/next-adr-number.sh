#!/bin/zsh
# Purpose: Calculate next ADR number
# Input: ADR directory path (default: ./adr)
# Output: Next number in 0001 format
set -euo pipefail

adr_dir="${1:-./adr}"

if [ ! -d "$adr_dir" ]; then
  echo "0001"
  exit 0
fi

last_num=$(ls "$adr_dir" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1 || echo "0000")
last_num=${last_num:-0000}

# Use 10# prefix to prevent octal interpretation
next_num=$((10#$last_num + 1))
printf "%04d\n" "$next_num"
