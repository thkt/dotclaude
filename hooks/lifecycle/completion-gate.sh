#!/usr/bin/env bash
# Auto-runs tests when agent stops. Blocks if tests fail (best-effort safety net).
# Spec: workspace/planning/2026-03-10-completion-gate/spec.md
set -euo pipefail

INPUT=$(cat)
STOP_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null) || true
if [ "$STOP_ACTIVE" = "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
CODE_CHANGES=$(git -C "$PROJECT_DIR" diff HEAD --name-only 2>/dev/null \
  | grep -v -E '\.(md|txt)$' \
  | head -1) || true

if [ -z "$CODE_CHANGES" ]; then
  exit 0
fi

TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then
  TIMEOUT_CMD="timeout 60"
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_CMD="gtimeout 60"
fi

block_with() {
  local reason="$1"
  jq -n --arg reason "$reason" \
    '{ decision: "block", reason: $reason }' \
    || { echo "completion-gate: jq unavailable, cannot block" >&2; exit 0; }
  exit 0
}

# Phase 1: Tests
if [ -z "${TEST_CMD:-}" ] && command -v nr &>/dev/null && [ -f "$PROJECT_DIR/package.json" ]; then
  TEST_CMD="nr test"
fi

if [ -n "${TEST_CMD:-}" ]; then
  TEST_OUTPUT=$($TIMEOUT_CMD $TEST_CMD 2>&1) && TEST_EXIT=0 || TEST_EXIT=$?
  if [ $TEST_EXIT -eq 124 ]; then
    echo "completion-gate: test timeout (60s)" >&2
  elif [ $TEST_EXIT -ne 0 ]; then
    block_with "Tests failed. Fix the failures:
$(echo "$TEST_OUTPUT" | tail -50)"
  fi
fi

# Phase 2: Gates
TOOLS_JSON="$PROJECT_DIR/.claude/tools.json"
[ -f "$TOOLS_JSON" ] || exit 0
command -v jq &>/dev/null || exit 0

run_gate() {
  local name="$1" cmd="$2" override="$3"
  local enabled
  enabled=$(jq -r ".gates.${name} // false" "$TOOLS_JSON" 2>/dev/null) || return 0
  [ "$enabled" = "true" ] || return 0

  local gate_cmd="${override:-$cmd}"
  command -v "$gate_cmd" &>/dev/null || return 0
  local gate_output gate_exit
  gate_output=$($TIMEOUT_CMD $gate_cmd 2>&1) && gate_exit=0 || gate_exit=$?
  [ $gate_exit -eq 0 ] && return 0
  [ $gate_exit -eq 124 ] && return 0
  block_with "${name} failed. Fix the issues:
$(echo "$gate_output" | tail -50)"
}

run_gate "knip" "knip" "${KNIP_CMD:-}"
run_gate "tsgo" "tsgo" "${TSGO_CMD:-}"
