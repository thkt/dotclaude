#!/bin/bash
# Shared utilities for lifecycle hooks
# Dependencies: jaq (install: brew install jaq)

WORKSPACE_DIR="${HOME}/.claude/workspace"

# Check jaq availability (required for JSONL processing)
require_jaq() {
  if ! command -v jaq &> /dev/null; then
    echo "Error: jaq is required but not installed." >&2
    echo "Install with: brew install jaq" >&2
    return 1
  fi
}

# Find most recently modified session JSONL (within last 30 minutes)
find_session_jsonl() {
  local project_dir="$HOME/.claude/projects"
  if [ -d "$project_dir" ]; then
    find "$project_dir" -name "*.jsonl" -mmin -30 2>/dev/null | head -1
  fi
}

has_session_changes() {
  require_jaq || return 1

  local session_jsonl
  session_jsonl=$(find_session_jsonl)
  [ -z "$session_jsonl" ] || [ ! -f "$session_jsonl" ] && return 1

  jaq -e 'try (select(.message.content[]?.name == "Write" or .message.content[]?.name == "Edit")) catch empty' "$session_jsonl" >/dev/null 2>&1
}

# Resolve IDR path: SOW-based or date-based fallback
resolve_idr_file() {
  local current_sow_file="${WORKSPACE_DIR}/.current-sow"

  if [ -f "$current_sow_file" ]; then
    local sow_path
    sow_path=$(cat "$current_sow_file")
    if [ -f "$sow_path" ]; then
      echo "$(dirname "$sow_path")/idr.md"
      return
    fi
  fi

  local date_dir="${WORKSPACE_DIR}/planning/$(date +%Y-%m-%d)"
  mkdir -p "$date_dir"
  echo "${date_dir}/idr.md"
}
