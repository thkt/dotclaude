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

if [ -n "${TEST_CMD:-}" ]; then
  :
elif command -v nr &>/dev/null && [ -f "$PROJECT_DIR/package.json" ]; then
  TEST_CMD="nr test"
else
  exit 0
fi

TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then
  TIMEOUT_CMD="timeout 60"
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_CMD="gtimeout 60"
fi

TEST_OUTPUT=$($TIMEOUT_CMD $TEST_CMD 2>&1) && exit 0

EXIT_CODE=$?
if [ $EXIT_CODE -eq 124 ]; then
  echo "completion-gate: test timeout (60s)" >&2
  exit 0
fi

REASON=$(echo "$TEST_OUTPUT" | tail -50)
jq -n --arg reason "$REASON" \
  '{ decision: "block", reason: ("Tests failed. Fix the failures:\n" + $reason) }' \
  || { echo "completion-gate: jq unavailable, cannot block" >&2; exit 0; }
