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

TIMEOUT_ARGS=()
if command -v timeout &>/dev/null; then
  TIMEOUT_ARGS=(timeout 60)
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_ARGS=(gtimeout 60)
fi

block_with() {
  local reason="$1"
  jq -n --arg reason "$reason" \
    '{ decision: "block", reason: $reason }' \
    || { echo "completion-gate: jq unavailable, cannot block" >&2; exit 0; }
  exit 0
}

# Phase 1: Tests
# Prefer test:type + test:unit when available (avoids running format/lint gates
# that can be slow or cause side-effects like prisma engine corruption).
if [ -z "${TEST_CMD:-}" ] && command -v nr &>/dev/null && [ -f "$PROJECT_DIR/package.json" ]; then
  if jq -e '.scripts["test:unit"]' "$PROJECT_DIR/package.json" >/dev/null 2>&1; then
    TEST_CMD="nr test:type && nr test:unit"
  else
    TEST_CMD="nr test"
  fi
fi

if [ -n "${TEST_CMD:-}" ]; then
  TEST_OUTPUT=$(${TIMEOUT_ARGS[@]+"${TIMEOUT_ARGS[@]}"} bash -c "$TEST_CMD" 2>&1) && TEST_EXIT=0 || TEST_EXIT=$?
  if [ $TEST_EXIT -eq 124 ]; then
    echo "completion-gate: test timeout (60s)" >&2
  elif [ $TEST_EXIT -ne 0 ]; then
    block_with "Tests failed. Fix the failures:
$(echo "$TEST_OUTPUT" | tail -50)"
  fi
fi
