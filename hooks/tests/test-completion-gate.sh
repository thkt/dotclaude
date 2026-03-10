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
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
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
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
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
  mock=$(make_mock_test "005" "true")
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "test was called" "yes" "$(was_called 005)"
}

test_006_test_cmd_env() {
  echo "T-006: TEST_CMD env var is used"
  local repo mock
  repo=$(make_repo_with_ts_change)
  mock=$(make_mock_test "006" "true")
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_eq "mock test called" "yes" "$(was_called 006)"
}

test_007_nr_test() {
  echo "T-007: nr + package.json → nr test"
  if ! command -v nr &>/dev/null; then
    echo "  SKIP: nr not installed"
    return
  fi
  local repo
  repo=$(make_repo)
  echo "const x = 1" > "$repo/app.ts"
  echo '{"scripts":{"test":"echo ok"}}' > "$repo/package.json"
  git -C "$repo" add . && git -C "$repo" commit -q -m "add"
  echo "const x = 2" > "$repo/app.ts"
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
}

test_008_no_test_cmd() {
  echo "T-008: no TEST_CMD, no package.json → exit 0"
  local repo
  repo=$(make_repo_with_ts_change)
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
}

test_009_test_pass() {
  echo "T-009: test pass → exit 0"
  local repo mock
  repo=$(make_repo_with_ts_change)
  mock=$(make_mock_test "009" "true")
  local exit_code=0 output
  output=$(cd "$repo" && echo '{}' | CLAUDE_PROJECT_DIR="$repo" TEST_CMD="$mock" bash "$HOOK" 2>/dev/null) || exit_code=$?
  assert_eq "exit 0" "0" "$exit_code"
  assert_empty "no block output" "$output"
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

echo "=== completion-gate.sh tests ==="
test_001_stop_hook_active
test_002_no_changes
test_003_excluded_extensions
test_005_json_change
test_006_test_cmd_env
test_007_nr_test
test_008_no_test_cmd
test_009_test_pass
test_010_test_fail_and_truncate

report_results
