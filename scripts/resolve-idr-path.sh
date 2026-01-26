#!/bin/bash
# Purpose: Resolve IDR file path based on current SOW or date
# Input: $1 = workspace directory (default: ~/.claude/workspace)
# Output: IDR file path
set -euo pipefail

workspace_dir="${1:-$HOME/.claude/workspace}"
current_sow_file="${workspace_dir}/.current-sow"

if [ -f "$current_sow_file" ]; then
  sow_path=$(cat "$current_sow_file")
  if [ -f "$sow_path" ]; then
    echo "$(dirname "$sow_path")/idr.md"
    exit 0
  fi
fi

date_dir="${workspace_dir}/planning/$(date +%Y-%m-%d)"
mkdir -p "$date_dir"
echo "${date_dir}/idr.md"
