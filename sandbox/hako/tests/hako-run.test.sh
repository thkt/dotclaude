#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../../hooks/lifecycle/tests/helpers.sh"
HAKO="$SCRIPT_DIR/../hako.sh"
AGENT_NAME="claude"

TEST_TMPDIR=$(mktemp -d "${TMPDIR:-/tmp}/hako-run-tests-XXXXXX")
cleanup() { rm -rf "$TEST_TMPDIR"; }
trap cleanup EXIT

export TMPDIR="$TEST_TMPDIR"

STUB_BIN="$TEST_TMPDIR/bin"
mkdir -p "$STUB_BIN"

FAKE_REPO="$TEST_TMPDIR/fake-repo"
mkdir -p "$FAKE_REPO"

CONTAINER_LOG="$TEST_TMPDIR/container.log"
GIT_LOG="$TEST_TMPDIR/git.log"

cat > "$STUB_BIN/container" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$CONTAINER_LOG"
exit 0
EOF
chmod +x "$STUB_BIN/container"

cat > "$STUB_BIN/git" <<EOF
#!/bin/sh
printf '%s\n' "\$*" >> "$GIT_LOG"
exit 0
EOF
chmod +x "$STUB_BIN/git"

run_hako() {
  local agent="$1" extra_flag="${2:-}"
  : > "$CONTAINER_LOG"
  : > "$GIT_LOG"
  (
    cd "$FAKE_REPO"
    export PATH="$STUB_BIN:$PATH"
    if [[ -n "$extra_flag" ]]; then
      "$HAKO" "$agent" "$extra_flag"
    else
      "$HAKO" "$agent"
    fi
  ) >"$TEST_TMPDIR/run.out" 2>&1
}

test_the_default_run_mounts_a_temporary_clone_of_the_repo_and_no_mount_argument_carries_pwd() {
  echo "T-011: the default run mounts a temporary clone of the repo and no mount argument carries \$PWD"
  run_hako "$AGENT_NAME" || true
  local run_line
  run_line="$(grep '^run ' "$CONTAINER_LOG" 2>/dev/null | head -1 || true)"
  assert_empty "no run argument contains the host \$PWD" \
    "$(printf '%s' "$run_line" | grep -F "$FAKE_REPO" 2>/dev/null || true)"
  assert_contains "the run mounts a workspace target" "/workspace" "$run_line"
  assert_contains "a throwaway git clone produced the mounted workspace" \
    "clone" "$(cat "$GIT_LOG" 2>/dev/null || true)"
}

test_only_live_mounts_pwd_as_the_workspace() {
  echo "T-012: only --live mounts \$PWD as the workspace"
  run_hako "$AGENT_NAME" "--live" || true
  local run_line
  run_line="$(grep '^run ' "$CONTAINER_LOG" 2>/dev/null | head -1 || true)"
  assert_contains "the run mounts the host \$PWD as the workspace" "$FAKE_REPO" "$run_line"
  assert_empty "no throwaway clone is made under --live" "$(cat "$GIT_LOG" 2>/dev/null || true)"
}

test_the_generated_run_arguments_carry_cap_add_net_admin_and_the_per_agent_named_volume_mount() {
  echo "T-013: the generated run arguments carry --cap-add NET_ADMIN and the per-agent named volume mount"
  run_hako "$AGENT_NAME" || true
  local volume_create_line volume_name run_line
  volume_create_line="$(grep '^volume create' "$CONTAINER_LOG" 2>/dev/null | head -1 || true)"
  assert_contains "a named volume was created" "volume create" "$volume_create_line"
  volume_name="$(printf '%s' "$volume_create_line" | awk '{print $3}' 2>/dev/null || true)"
  assert_contains "the volume name is scoped to this agent" "$AGENT_NAME" "$volume_name"

  run_line="$(grep '^run ' "$CONTAINER_LOG" 2>/dev/null | head -1 || true)"
  assert_contains "run carries the cap-add flag" "cap-add" "$run_line"
  assert_contains "run adds the NET_ADMIN capability" "NET_ADMIN" "$run_line"
  assert_contains "run mounts the same per-agent volume volume-create made" "$volume_name" "$run_line"
}

echo "=== hako.sh run-argument tests ==="
test_the_default_run_mounts_a_temporary_clone_of_the_repo_and_no_mount_argument_carries_pwd
test_only_live_mounts_pwd_as_the_workspace
test_the_generated_run_arguments_carry_cap_add_net_admin_and_the_per_agent_named_volume_mount

report_results
