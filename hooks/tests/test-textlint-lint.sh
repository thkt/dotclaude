#!/usr/bin/env bash
# Integration tests for textlint-lint.sh (PreToolUse hook)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"
HOOK="$SCRIPT_DIR/../textlint-lint.sh"

test_issue_create_advisory() {
  echo "T-006: gh issue create with problematic body returns advisory"
  local body='革命的な技術で業界を変えます。することができます。'
  local cmd="gh issue create --title \"test\" --body \"$body\""
  local json
  json=$(make_bash_json "$cmd")
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "outputs JSON" "decision" "$output"
  assert_contains "decision is approve" "approve" "$output"
  assert_contains "has additionalContext" "additionalContext" "$output"
}

test_issue_create_clean() {
  echo "T-007: gh issue create with clean body returns structure checklist only"
  local body='テストです。'
  local cmd="gh issue create --title \"test\" --body \"$body\""
  local json
  json=$(make_bash_json "$cmd")
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "has structure checklist" "構造レビュー" "$output"
  assert_contains "decision is approve" "approve" "$output"
}

test_non_gh_command_skipped() {
  echo "T-008: git status is skipped"
  local json='{"tool_name":"Bash","tool_input":{"command":"git status"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output for git status" "$output"
}

test_pr_create_advisory() {
  echo "T-010: gh pr create with problematic body returns advisory"
  local body='革命的な技術で業界を変えます。'
  local cmd="gh pr create --title \"test\" --body \"$body\""
  local json
  json=$(make_bash_json "$cmd")
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "outputs advisory" "additionalContext" "$output"
}

test_non_bash_tool_skipped() {
  echo "T-012: Write tool is skipped"
  local json='{"tool_name":"Write","tool_input":{"file_path":"/some/file.md"}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output for Write tool" "$output"
}

test_no_body_skipped() {
  echo "T-013: gh issue create without --body is skipped"
  local json='{"tool_name":"Bash","tool_input":{"command":"gh issue create --title \"test\""}}'
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_empty "no output without --body" "$output"
}

test_english_body_structure_only() {
  echo "T-014: English body gets structure checklist only (no textlint)"
  local body='This is an English issue body with enough content to verify that textlint does not run on non-Japanese text. The structure review should still appear.'
  local cmd="gh issue create --title \"test\" --body \"$body\""
  local json
  json=$(make_bash_json "$cmd")
  local output
  output=$(echo "$json" | bash "$HOOK" 2>/dev/null) || true
  assert_contains "has structure checklist" "構造レビュー" "$output"
  assert_contains "decision is approve" "approve" "$output"
}

echo "=== textlint-lint.sh tests ==="
test_issue_create_advisory
test_issue_create_clean
test_non_gh_command_skipped
test_pr_create_advisory
test_non_bash_tool_skipped
test_no_body_skipped
test_english_body_structure_only

report_results
