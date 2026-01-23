#!/bin/bash
# shellcheck shell=bash
# Shared utilities for lifecycle hooks (requires: jaq)

# Sandbox-compatible temp directory
export TMPDIR="${TMPDIR:-/tmp/claude}"
mkdir -p "$TMPDIR" 2>/dev/null || true

# Debug logging (set DEBUG_LOG=/path/to/file to enable)
DEBUG_LOG="${DEBUG_LOG:-}"

WORKSPACE_DIR="${HOME}/.claude/workspace"

require_jaq() {
  if ! command -v jaq &> /dev/null; then
    echo "Error: jaq is required but not installed." >&2
    echo "Install with: brew install jaq" >&2
    return 1
  fi
}

find_session_jsonl() {
  local project_dir="$HOME/.claude/projects"
  if [ -d "$project_dir" ]; then
    local find_err result
    find_err="${TMPDIR}/find_err_$$"
    result=$(find "$project_dir" -name "*.jsonl" -mmin -30 -not -path "*/subagents/*" -print0 2>"$find_err" | \
      xargs -0 ls -t 2>>"$find_err" | head -1)
    if [ -n "$DEBUG_LOG" ] && [ -s "$find_err" ]; then
      echo "[DEBUG] find_session_jsonl errors: $(cat "$find_err")" >> "$DEBUG_LOG"
    fi
    rm -f "$find_err" 2>/dev/null || true
    echo "$result"
  fi
}

has_session_changes() {
  require_jaq || return 1

  local session_jsonl jaq_err
  session_jsonl=$(find_session_jsonl)
  [ -z "$session_jsonl" ] || [ ! -f "$session_jsonl" ] && return 1

  jaq_err="${TMPDIR}/jaq_err_$$"
  if jaq -e 'try (select(.message.content[]?.name == "Write" or .message.content[]?.name == "Edit")) catch empty' "$session_jsonl" >/dev/null 2>"$jaq_err"; then
    rm -f "$jaq_err" 2>/dev/null || true
    return 0
  else
    local exit_code=$?
    if [ -n "$DEBUG_LOG" ] && [ -s "$jaq_err" ]; then
      echo "[DEBUG] jaq error (exit $exit_code): $(cat "$jaq_err")" >> "$DEBUG_LOG"
    fi
    rm -f "$jaq_err" 2>/dev/null || true
    return $exit_code
  fi
}

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
