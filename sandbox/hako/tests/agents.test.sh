#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../../hooks/lifecycle/tests/helpers.sh"
AGENTS="$SCRIPT_DIR/../agents.sh"

test_claude_resolves_an_exec_command_an_auth_directory_and_an_allowlist() {
  echo "T-001: claude resolves an exec command, an auth directory, and an allowlist"
  assert_eq "exec command" "claude --dangerously-skip-permissions" "$("$AGENTS" exec claude)"
  assert_eq "auth directory" "/home/node/.claude" "$("$AGENTS" auth-dir claude)"
  assert_contains "allowlist resolves" "github.com" "$("$AGENTS" allowlist claude)"
}

test_an_unknown_agent_name_exits_non_zero_and_prints_the_valid_agent_names_to_stderr() {
  echo "T-002: an unknown agent name exits non-zero and prints the valid agent names to stderr"
  local status=0 err
  err="$("$AGENTS" exec bogus 2>&1 1>/dev/null)" || status=$?
  assert_eq "exit code is non-zero" "yes" "$([[ "$status" -ne 0 ]] && echo yes || echo no)"
  assert_contains "stderr lists valid agent names" "valid agent names: claude" "$err"
}

test_the_allowlist_carries_both_the_shared_domains_and_the_claude_specific_ones() {
  echo "T-003: the allowlist carries both the shared domains and the claude-specific ones"
  local list
  list="$("$AGENTS" allowlist claude)"
  assert_contains "shared domain github.com" "github.com" "$list"
  assert_contains "shared domain api.github.com" "api.github.com" "$list"
  assert_contains "shared domain registry.npmjs.org" "registry.npmjs.org" "$list"
  assert_contains "claude-specific domain api.anthropic.com" "api.anthropic.com" "$list"
}

echo "=== agents.sh tests ==="
test_claude_resolves_an_exec_command_an_auth_directory_and_an_allowlist
test_an_unknown_agent_name_exits_non_zero_and_prints_the_valid_agent_names_to_stderr
test_the_allowlist_carries_both_the_shared_domains_and_the_claude_specific_ones

report_results
