#!/bin/bash
# Purpose: Convert text to slug format
# Input: $1 or stdin
# Output: Slug format (e.g., "My Title!" -> "my-title")
set -euo pipefail

if [ -n "${1:-}" ]; then
  text="$1"
else
  read -r text
fi

echo "$text" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/ /-/g' \
  | sed 's/[^a-z0-9-]//g' \
  | sed 's/-\{2,\}/-/g' \
  | sed 's/^-//;s/-$//'
