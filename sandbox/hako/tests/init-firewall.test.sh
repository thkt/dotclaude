#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../../hooks/lifecycle/tests/helpers.sh"
source "$SCRIPT_DIR/_stubs.sh"
INIT_FIREWALL="$SCRIPT_DIR/../init-firewall.sh"
AGENTS="$SCRIPT_DIR/../agents.sh"
AGENT_NAME="claude"

TEST_TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/init-firewall-tests-XXXXXX")
cleanup() { rm -rf "$TEST_TMPDIR"; }
trap cleanup EXIT

STUB_BIN="$TEST_TMPDIR/bin"
mkdir -p "$STUB_BIN"

IPTABLES_LOG="$TEST_TMPDIR/iptables.log"
IPSET_LOG="$TEST_TMPDIR/ipset.log"
: > "$IPTABLES_LOG"
: > "$IPSET_LOG"

install_network_stubs "$STUB_BIN" "$IPTABLES_LOG" "$IPSET_LOG"

GOOD_RESOLV_CONF="$TEST_TMPDIR/resolv.conf"
printf 'nameserver 10.9.9.9\n' > "$GOOD_RESOLV_CONF"

run_firewall() {
  (
    export PATH="$STUB_BIN:$PATH"
    export RESOLV_CONF="${RESOLV_CONF:-$GOOD_RESOLV_CONF}"
    "$INIT_FIREWALL" "$AGENT_NAME"
  ) >"$TEST_TMPDIR/run.out" 2>&1
}

test_the_udp_53_rule_is_generated_from_the_nameserver_in_resolv_conf() {
  echo "the udp/53 rule is generated from the nameserver in resolv.conf"
  : > "$IPTABLES_LOG"
  RESOLV_CONF="$GOOD_RESOLV_CONF" run_firewall || true
  assert_contains "udp/53 rule names the resolv.conf nameserver" \
    "10.9.9.9" "$(grep -i 'udp' "$IPTABLES_LOG" 2>/dev/null || true)"
}

test_a_failed_dns_resolution_of_an_allowed_domain_exits_non_zero() {
  echo "a failed DNS resolution of an allowed domain exits non-zero"
  local status=0
  DIG_FAIL_DOMAIN="api.anthropic.com" run_firewall || status=$?
  assert_eq "exit code is non-zero" "yes" "$([[ "$status" -ne 0 ]] && echo yes || echo no)"
  assert_contains "failure names the domain that failed to resolve" \
    "api.anthropic.com" "$(cat "$TEST_TMPDIR/run.out" 2>/dev/null || true)"
}

test_reaching_a_blocked_domain_in_the_post_check_exits_non_zero() {
  echo "reaching a blocked domain in the post-check exits non-zero"
  local status=0
  CURL_BLOCKED_REACHABLE=1 run_firewall || status=$?
  assert_eq "exit code is non-zero" "yes" "$([[ "$status" -ne 0 ]] && echo yes || echo no)"
  assert_contains "failure names the domain the post-check reached" \
    "example.com" "$(cat "$TEST_TMPDIR/run.out" 2>/dev/null || true)"
}

test_the_domain_set_entering_ipset_comes_from_the_agents_table_rather_than_a_constant_in_the_script() {
  echo "the domain set entering ipset comes from the agents table rather than a constant in the script"
  local marker_dir="$TEST_TMPDIR/marker-sandbox"
  mkdir -p "$marker_dir"
  cp "$INIT_FIREWALL" "$marker_dir/init-firewall.sh" 2>/dev/null || true
  cp "$AGENTS" "$marker_dir/agents.sh" 2>/dev/null || true
  chmod +x "$marker_dir/init-firewall.sh" "$marker_dir/agents.sh" 2>/dev/null || true
  sed -i.bak 's/api\.anthropic\.com/marker-domain.example/' "$marker_dir/agents.sh" 2>/dev/null || true

  : > "$IPSET_LOG"
  (
    export PATH="$STUB_BIN:$PATH"
    export RESOLV_CONF="$GOOD_RESOLV_CONF"
    "$marker_dir/init-firewall.sh" "$AGENT_NAME"
  ) >"$TEST_TMPDIR/marker-run.out" 2>&1 || true

  assert_contains "ipset receives the marker domain from the copied agents table" \
    "marker-domain.example" "$(cat "$IPSET_LOG" 2>/dev/null || true)"
}

echo "=== init-firewall.sh tests ==="
test_the_udp_53_rule_is_generated_from_the_nameserver_in_resolv_conf
test_a_failed_dns_resolution_of_an_allowed_domain_exits_non_zero
test_reaching_a_blocked_domain_in_the_post_check_exits_non_zero
test_the_domain_set_entering_ipset_comes_from_the_agents_table_rather_than_a_constant_in_the_script

report_results
