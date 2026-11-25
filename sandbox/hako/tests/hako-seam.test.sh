#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../../hooks/lifecycle/tests/helpers.sh"
source "$SCRIPT_DIR/_stubs.sh"
HAKO="$SCRIPT_DIR/../hako.sh"
ENTRYPOINT="$SCRIPT_DIR/../entrypoint.sh"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKFLOW="$REPO_ROOT/.github/workflows/test.yml"
AGENT_ROWS=(
  "claude|dangerously-skip-permissions"
  "codex|dangerously-bypass-approvals-and-sandbox"
)

TEST_TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/hako-seam-tests-XXXXXX")
cleanup() { rm -rf "$TEST_TMPDIR"; }
trap cleanup EXIT

export TMPDIR="$TEST_TMPDIR"

STUB_BIN="$TEST_TMPDIR/bin"
mkdir -p "$STUB_BIN"

FAKE_REPO="$TEST_TMPDIR/fake-repo"
mkdir -p "$FAKE_REPO"

CONTAINER_LOG="$TEST_TMPDIR/container.log"
GOSU_LOG="$TEST_TMPDIR/gosu.log"
IPTABLES_LOG="$TEST_TMPDIR/iptables.log"
IPSET_LOG="$TEST_TMPDIR/ipset.log"
RUN_OUT="$TEST_TMPDIR/run.out"

cat > "$STUB_BIN/git" <<'EOF'
#!/bin/sh
exit 0
EOF
chmod +x "$STUB_BIN/git"

cat > "$STUB_BIN/container" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$CONTAINER_LOG"
if [ "\$1" != "run" ]; then
  exit 0
fi
agent=""
for a; do agent="\$a"; done
exec "$ENTRYPOINT" "\$agent"
EOF
chmod +x "$STUB_BIN/container"

for row in "${AGENT_ROWS[@]}"; do
  agent="${row%%|*}"
  cat > "$STUB_BIN/$agent" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$TEST_TMPDIR/$agent.log"
exit 0
EOF
  chmod +x "$STUB_BIN/$agent"
done

cat > "$STUB_BIN/gosu" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$GOSU_LOG"
shift
cmd="\$1"
if [ "\$cmd" = "iptables" ]; then
  exit 1
fi
exec "\$@"
EOF
chmod +x "$STUB_BIN/gosu"

install_network_stubs "$STUB_BIN" "$IPTABLES_LOG" "$IPSET_LOG"

GOOD_RESOLV_CONF="$TEST_TMPDIR/resolv.conf.good"
printf 'nameserver 10.9.9.9\n' > "$GOOD_RESOLV_CONF"
BAD_RESOLV_CONF="$TEST_TMPDIR/resolv.conf.bad"
: > "$BAD_RESOLV_CONF"

run_chain() {
  local agent="$1" resolv_conf="$2"
  : > "$CONTAINER_LOG"; : > "$GOSU_LOG"; : > "$IPTABLES_LOG"; : > "$IPSET_LOG"; : > "$TEST_TMPDIR/$agent.log"
  (
    cd "$FAKE_REPO"
    export PATH="$STUB_BIN:$PATH"
    export RESOLV_CONF="$resolv_conf"
    "$HAKO" "$agent"
  ) >"$RUN_OUT" 2>&1
}

test_hako_sh_agents_run_arguments_drive_the_entrypoint_to_exec_the_agent_as_the_demoted_user_after_the_firewall_applies() {
  local row agent flag
  for row in "${AGENT_ROWS[@]}"; do
    agent="${row%%|*}"
    flag="${row#*|}"
    echo "hako.sh $agent's run arguments drive the entrypoint to exec $agent as the demoted user after the firewall applies"
    local status=0
    run_chain "$agent" "$GOOD_RESOLV_CONF" || status=$?
    assert_eq "$agent: the whole chain exits zero" "0" "$status"

    local run_line last_arg
    run_line="$(grep '^run ' "$CONTAINER_LOG" 2>/dev/null | head -1 || true)"
    last_arg="$(printf '%s' "$run_line" | awk '{print $NF}')"
    assert_eq "$agent: the run arguments' trailing positional argument is the agent name" \
      "$agent" "$last_arg"

    assert_contains "$agent: the real init-firewall.sh actually applied rules (not skipped)" \
      "ACCEPT" "$(cat "$IPTABLES_LOG" 2>/dev/null || true)"

    local exec_line
    exec_line="$(grep -v iptables "$GOSU_LOG" 2>/dev/null | head -1 || true)"
    assert_eq "$agent: entrypoint demotes to node and execs the agent's own command from agents.sh" \
      "node $agent --$flag" "$exec_line"

    assert_contains "$agent: the agent actually ran, carrying the flag agents.sh resolved for it" \
      "$flag" "$(cat "$TEST_TMPDIR/$agent.log" 2>/dev/null || true)"
  done
}

test_a_non_zero_exit_from_init_firewall_sh_leaves_the_agent_unexeced_and_ends_the_whole_chain_non_zero() {
  echo "a non-zero exit from init-firewall.sh leaves the agent unexec'd and ends the whole chain non-zero"
  local status=0
  run_chain claude "$BAD_RESOLV_CONF" || status=$?
  assert_eq "the whole chain exits non-zero" "yes" "$([[ "$status" -ne 0 ]] && echo yes || echo no)"
  assert_contains "the failure is attributed to the firewall" \
    "firewall" "$(cat "$RUN_OUT" 2>/dev/null || true)"
  assert_empty "no demotion is ever attempted" "$(cat "$GOSU_LOG" 2>/dev/null || true)"
  assert_empty "claude never runs" "$(cat "$TEST_TMPDIR/claude.log" 2>/dev/null || true)"
}

test_the_ci_shell_tests_step_discovers_every_test_file_under_sandbox() {
  echo "the CI Shell tests step discovers every test file under sandbox"
  local shell_step find_cmd discovered
  shell_step="$(awk '/name: Shell tests/{flag=1; next} /- name:/{if (flag) exit} flag' "$WORKFLOW")"
  find_cmd="$(printf '%s' "$shell_step" | grep -oE 'find [^|]+' | head -1)"
  assert_contains "the Shell tests step still runs a find command" "find" "$find_cmd"

  discovered="$(cd "$REPO_ROOT" && eval "$find_cmd" 2>/dev/null)"
  assert_contains "the find target discovers this seam test file under sandbox" \
    "sandbox/hako/tests/hako-seam.test.sh" "$discovered"
}

echo "=== hako seam tests ==="
test_hako_sh_agents_run_arguments_drive_the_entrypoint_to_exec_the_agent_as_the_demoted_user_after_the_firewall_applies
test_a_non_zero_exit_from_init_firewall_sh_leaves_the_agent_unexeced_and_ends_the_whole_chain_non_zero
test_the_ci_shell_tests_step_discovers_every_test_file_under_sandbox

report_results
