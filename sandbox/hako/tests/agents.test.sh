#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../../hooks/lifecycle/tests/helpers.sh"
AGENTS="$SCRIPT_DIR/../agents.sh"

AGENT_ROWS=(
  "claude|dangerously-skip-permissions|/home/node/.claude"
  "codex|dangerously-bypass-approvals-and-sandbox|/home/node/.codex"
)

test_each_agent_resolves_an_exec_command_and_an_auth_directory() {
  local row agent exec_word auth_dir
  for row in "${AGENT_ROWS[@]}"; do
    IFS='|' read -r agent exec_word auth_dir <<< "$row"
    echo "$agent resolves an exec command and an auth directory"
    assert_contains "$agent: exec command carries $exec_word" "$exec_word" "$("$AGENTS" exec "$agent")"
    assert_eq "$agent: auth directory" "$auth_dir" "$("$AGENTS" auth-dir "$agent")"
  done
}

test_an_unknown_agent_name_exits_non_zero_and_prints_the_valid_agent_names_to_stderr() {
  echo "an unknown agent name exits non-zero and prints the valid agent names to stderr"
  local status=0 err
  err="$("$AGENTS" exec bogus 2>&1 1>/dev/null)" || status=$?
  assert_eq "exit code is non-zero" "yes" "$([[ "$status" -ne 0 ]] && echo yes || echo no)"
  assert_contains "stderr lists valid agent names" "valid agent names: claude" "$err"
}

test_the_allowlist_carries_both_the_shared_domains_and_the_claude_specific_ones() {
  echo "the allowlist carries both the shared domains and the claude-specific ones"
  local list
  list="$("$AGENTS" allowlist claude)"
  assert_contains "shared domain github.com" "github.com" "$list"
  assert_contains "shared domain api.github.com" "api.github.com" "$list"
  assert_contains "shared domain registry.npmjs.org" "registry.npmjs.org" "$list"
  assert_contains "claude-specific domain api.anthropic.com" "api.anthropic.com" "$list"
}

test_the_domain_set_entering_ipset_for_codex_differs_from_the_one_for_claude() {
  echo "the domain set entering ipset for codex differs from the one for claude"
  local claude_list codex_list
  claude_list="$("$AGENTS" allowlist claude 2>/dev/null)" || true
  codex_list="$("$AGENTS" allowlist codex 2>/dev/null)" || true
  assert_contains "codex resolves an allowlist at all" "registry.npmjs.org" "$codex_list"
  assert_eq "codex's allowlist differs from claude's" "yes" \
    "$([[ -n "$codex_list" && "$claude_list" != "$codex_list" ]] && echo yes || echo no)"
}

echo "=== agents.sh tests ==="
test_each_agent_resolves_an_exec_command_and_an_auth_directory
test_an_unknown_agent_name_exits_non_zero_and_prints_the_valid_agent_names_to_stderr
test_the_allowlist_carries_both_the_shared_domains_and_the_claude_specific_ones
test_the_domain_set_entering_ipset_for_codex_differs_from_the_one_for_claude

report_results
