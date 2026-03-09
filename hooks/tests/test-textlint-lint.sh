#!/usr/bin/env bash
# Integration tests for textlint-lint.sh (PreToolUse hook)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/../textlint-lint.sh"
PASS=0
FAIL=0

assert_eq() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local name="$1" pattern="$2" text="$3"
  if echo "$text" | grep -q "$pattern"; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (pattern '$pattern' not found)"
    echo "    text: $(echo "$text" | head -3)"
    FAIL=$((FAIL + 1))
  fi
}

assert_empty() {
  local name="$1" text="$2"
  if [[ -z "$text" ]]; then
    echo "  PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (expected empty, got: $(echo "$text" | head -1))"
    FAIL=$((FAIL + 1))
  fi
}

# T-006: gh issue create with AI-ish body returns advisory
test_issue_create_advisory() {
  echo "T-006: gh issue create with problematic body returns advisory"
  local body='革命的な技術で業界を変えます。することができます。'
  local cmd="gh issue create --title \"test\" --body \"$body\""
  local json='{"tool_name":"Bash","tool_input":{"command":"'"$(echo "$cmd" | sed 's/"/\\"/g')"'"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "outputs JSON" "decision" "$output"
  assert_contains "decision is approve" "approve" "$output"
  assert_contains "has additionalContext" "additionalContext" "$output"
}

# T-007: gh issue create with clean body returns structure checklist (no textlint section)
test_issue_create_clean() {
  echo "T-007: gh issue create with clean body returns structure checklist only"
  local body='テストです。'
  local cmd="gh issue create --title \"test\" --body \"$body\""
  local json='{"tool_name":"Bash","tool_input":{"command":"'"$(echo "$cmd" | sed 's/"/\\"/g')"'"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "has structure checklist" "構造レビュー" "$output"
  assert_contains "decision is approve" "approve" "$output"
}

# T-008: Non-gh command is skipped
test_non_gh_command_skipped() {
  echo "T-008: git status is skipped"
  local json='{"tool_name":"Bash","tool_input":{"command":"git status"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output for git status" "$output"
}

# T-010: gh pr create with problematic body returns advisory
test_pr_create_advisory() {
  echo "T-010: gh pr create with problematic body returns advisory"
  local body='革命的な技術で業界を変えます。'
  local cmd="gh pr create --title \"test\" --body \"$body\""
  local json='{"tool_name":"Bash","tool_input":{"command":"'"$(echo "$cmd" | sed 's/"/\\"/g')"'"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "outputs advisory" "additionalContext" "$output"
}

# T-extra: Non-Bash tool is skipped
test_non_bash_tool_skipped() {
  echo "T-extra: Write tool is skipped"
  local json='{"tool_name":"Write","tool_input":{"file_path":"/some/file.md"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output for Write tool" "$output"
}

# T-extra: gh issue create without --body is skipped
test_no_body_skipped() {
  echo "T-extra: gh issue create without --body is skipped"
  local json='{"tool_name":"Bash","tool_input":{"command":"gh issue create --title \"test\""}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output without --body" "$output"
}

echo "=== textlint-lint.sh tests ==="
test_issue_create_advisory
test_issue_create_clean
test_non_gh_command_skipped
test_pr_create_advisory
test_non_bash_tool_skipped
test_no_body_skipped

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]]
