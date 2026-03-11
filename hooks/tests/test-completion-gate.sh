#!/usr/bin/env bash
# Spec: workspace/planning/2026-03-10-completion-gate/spec.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"
HOOK="$SCRIPT_DIR/../lifecycle/completion-gate.sh"
TMPDIR_BASE="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR_BASE"; }
trap cleanup EXIT

make_repo() {
  local dir
  dir=$(mktemp -d "$TMPDIR_BASE/repo-XXXXXX")
  git -C "$dir" init -q
  git -C "$dir" config user.email "test@test.com"
  git -C "$dir" config user.name "test"
  echo "init" > "$dir/init.txt"
  git -C "$dir" add . >/dev/null 2>&1
  git -C "$dir" commit -q -m "init" >/dev/null 2>&1
  echo "$dir"
}

make_mock_test() {
  local name="$1" pass="${2:-true}"
  local marker="$TMPDIR_BASE/marker-$name"
  local script="$TMPDIR_BASE/mock-$name.sh"
  if [ "$pass" = "true" ]; then
    cat > "$script" <<MOCK
#!/usr/bin/env bash
touch "$marker"
exit 0
MOCK
  else
    cat > "$script" <<MOCK
#!/usr/bin/env bash
touch "$marker"
echo "FAIL: test error"
exit 1
MOCK
  fi
  chmod +x "$script"
  echo "$script"
}

make_repo_with_ts_change() {
  local repo
  repo=$(make_repo)
  echo "const x = 1" > "$repo/app.ts"
  git -C "$repo" add app.ts && git -C "$repo" commit -q -m "add ts"
  echo "const x = 2" > "$repo/app.ts"
  echo "$repo"
}

was_called() {
  local name="$1"
  test -f "$TMPDIR_BASE/marker-$name" && echo "yes" || echo "no"
}

test_001_stop_hook_active() {
  echo "T-001: stop_hook_active: true → exit 0, test not run"
  local mock
  mock=$(make_mock_test "001")
  local exit_code=0 output
  output=$(echo '{"stop_hook_active":true}' | TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_empty "no output" "$output"
  assert_eq "test not called" "no" "$(was_called 001)"
}

test_002_no_changes() {
  echo "T-002: no git changes → exit 0, test not run"
  local repo mock
  repo=$(make_repo)
  mock=$(make_mock_test "002")
  local exit_code=0
  (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_eq "test not called" "no" "$(was_called 002)"
}

test_003_excluded_extensions() {
  echo "T-003: .md/.txt only changes → exit 0, test not run"
  local repo mock
  repo=$(make_repo)
  echo "# doc" > "$repo/README.md"
  echo "note" > "$repo/notes.txt"
  git -C "$repo" add README.md notes.txt && git -C "$repo" commit -q -m "add docs"
  echo "# updated" > "$repo/README.md"
  echo "updated" > "$repo/notes.txt"
  mock=$(make_mock_test "003")
  local exit_code=0
  (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_eq "test not called" "no" "$(was_called 003)"
}

test_005_json_change() {
  echo "T-005: .json change → test detection proceeds"
  local repo mock
  repo=$(make_repo)
  echo '{}' > "$repo/config.json"
  git -C "$repo" add config.json && git -C "$repo" commit -q -m "add json"
  echo '{"key":"val"}' > "$repo/config.json"
  mock=$(make_mock_test "005")
  local exit_code=0
  (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
  assert_eq "test was called" "yes" "$(was_called 005)"
}

test_006_test_cmd_pass() {
  echo "T-006: TEST_CMD pass → exit 0, mock called, no block output"
  local repo mock
  repo=$(make_repo_with_ts_change)
  mock=$(make_mock_test "006")
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_eq "mock test called" "yes" "$(was_called 006)"
  assert_empty "no block output" "$output"
}

test_007_nr_test() {
  echo "T-007: nr + package.json → nr test (with marker verification)"
  if ! command -v nr &>/dev/null; then
    echo "  SKIP: nr not installed"
    return
  fi
  local repo marker="$TMPDIR_BASE/marker-007"
  repo=$(make_repo)
  echo "const x = 1" > "$repo/app.ts"
  echo "{\"scripts\":{\"test\":\"touch $marker\"}}" > "$repo/package.json"
  echo '{}' > "$repo/package-lock.json"
  git -C "$repo" add . && git -C "$repo" commit -q -m "add"
  echo "const x = 2" > "$repo/app.ts"
  local exit_code=0
  (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_eq "test actually ran" "yes" "$(test -f "$marker" && echo yes || echo no)"
}

test_008_no_test_cmd() {
  echo "T-008: no TEST_CMD, no package.json → exit 0"
  local repo
  repo=$(make_repo_with_ts_change)
  local exit_code=0
  (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
}

test_010_test_fail_and_truncate() {
  echo "T-010: test fail → block with truncated output"
  local repo
  repo=$(make_repo_with_ts_change)
  local mock_test="$TMPDIR_BASE/fail-test-010.sh"
  cat > "$mock_test" <<'MOCK'
#!/usr/bin/env bash
for i in $(seq 1 100); do
  echo "line $i of test output"
done
exit 1
MOCK
  chmod +x "$mock_test"
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock_test" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0 (hook itself)" "0" "$exit_code"
  assert_contains "decision block" '"block"' "$output"
  assert_contains "has reason" "Tests failed" "$output"
  assert_contains "has line 51" "line 51 of" "$output"
  assert_contains "has line 100" "line 100 of" "$output"
  assert_not_contains "no line 50" "line 50 of" "$output"
}

make_repo_with_npm() {
  local id="$1" scripts="$2"
  local repo m_type="$TMPDIR_BASE/ran-type-$id" m_unit="$TMPDIR_BASE/ran-unit-$id" m_full="$TMPDIR_BASE/ran-full-$id"
  repo=$(make_repo_with_ts_change)
  # Inject marker touches into scripts so we can verify which ran
  local json
  json=$(echo "$scripts" \
    | sed -e "s|TEST_MARKER|touch $m_full|" -e "s|TYPE_MARKER|touch $m_type|" -e "s|UNIT_MARKER|touch $m_unit|")
  echo "$json" > "$repo/package.json"
  echo '{}' > "$repo/package-lock.json"
  echo "$repo"
}

ran() { test -f "$TMPDIR_BASE/ran-$1" && echo "yes" || echo "no"; }

test_011_014_nr_script_detection() {
  echo "T-011-014: nr script detection (type+unit, unit-only, type-only, fallback)"
  if ! command -v nr &>/dev/null; then echo "  SKIP: nr not installed"; return; fi

  # id | scripts | expect_type | expect_unit | expect_full
  local cases=(
    '011|{"scripts":{"test":"TEST_MARKER","test:type":"TYPE_MARKER","test:unit":"UNIT_MARKER"}}|yes|yes|no'
    '012|{"scripts":{"test":"TEST_MARKER","test:unit":"UNIT_MARKER"}}|no|yes|no'
    '013|{"scripts":{"test":"TEST_MARKER","test:type":"TYPE_MARKER"}}|yes|no|no'
    '014|{"scripts":{"test":"TEST_MARKER"}}|no|no|yes'
  )

  for case in "${cases[@]}"; do
    IFS='|' read -r id scripts exp_type exp_unit exp_full <<< "$case"
    local repo exit_code=0
    repo=$(make_repo_with_npm "$id" "$scripts")
    (cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" >/dev/null 2>&1) || exit_code=$?
    assert_eq "$id: exit 0" "0" "$exit_code"
    assert_eq "$id: type" "$exp_type" "$(ran "type-$id")"
    assert_eq "$id: unit" "$exp_unit" "$(ran "unit-$id")"
    assert_eq "$id: full" "$exp_full" "$(ran "full-$id")"
  done
}

test_015_type_fail_blocks() {
  echo "T-015: test:type fail → block"
  if ! command -v nr &>/dev/null; then echo "  SKIP: nr not installed"; return; fi
  local repo
  repo=$(make_repo_with_npm "015" '{"scripts":{"test:type":"exit 1","test:unit":"UNIT_MARKER"}}')
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0 (hook itself)" "0" "$exit_code"
  assert_contains "blocked" "Tests failed" "$output"
  assert_eq "unit not ran (short-circuit)" "no" "$(ran unit-015)"
}

test_016_timeout_no_block() {
  echo "T-016: test timeout → exit 0, no block, stderr message"
  if ! command -v timeout &>/dev/null && ! command -v gtimeout &>/dev/null; then
    echo "  SKIP: neither timeout nor gtimeout available"
    return
  fi
  local repo
  repo=$(make_repo_with_ts_change)
  local exit_code=0 output stderr_file="$TMPDIR_BASE/stderr-016"
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" GATE_TIMEOUT=1 TEST_CMD="sleep 10" bash "$HOOK" 2>"$stderr_file") || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_empty "no block output" "$output"
  assert_contains "stderr timeout msg" "test timeout" "$(cat "$stderr_file")"
}

echo "=== completion-gate.sh tests ==="
test_001_stop_hook_active
test_002_no_changes
test_003_excluded_extensions
test_005_json_change
test_006_test_cmd_pass
test_007_nr_test
test_008_no_test_cmd
test_010_test_fail_and_truncate
test_011_014_nr_script_detection
test_015_type_fail_blocks
test_016_timeout_no_block

report_results
