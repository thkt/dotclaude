#!/usr/bin/env bash
# Phase 2 tests for the Stop hook reflection-activity pipeline.
#
# Scope (Phase 2 of Spec 2026-05-14-stop-hook-reflection):
#   Cover FRs : FR-005, FR-006 (mechanical activity log, no LLM)
#   Cover T-NNN: T-004, T-005
#   Cover FR-009 (recursion guard) for activity.sh
#   Cover FR-V001 / FR-V002 stderr fail-open paths for activity.sh
#
# Target (Red phase — files not expected yet):
#   ~/.claude/hooks/lifecycle/reflection-activity.sh
#
# Test design notes:
#   - activity.sh uses NO LLM. It parses history.jsonl deterministically.
#   - Fixture: tests/fixtures/sample-history.jsonl with Edit + Write + TodoWrite
#     + git-commit Bash + a non-commit Bash (ignored).
#   - REFLECT_KNOWLEDGE_DIR overrides on-disk dir to tmp scratch space.
#   - REFLECT_HOOK_SESSION=1 short-circuits the script (Phase 1 contract).
#   - Hook input must include `transcript_path` so activity.sh can locate the
#     jsonl. session_id is also required for the output filename.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/lifecycle/reflection-activity.sh"

TMPDIR_BASE="$(mktemp -d)"
FIXTURE_HISTORY="$SCRIPT_DIR/fixtures/sample-history.jsonl"

cleanup() {
  rm -rf "$TMPDIR_BASE" 2>/dev/null || true
}
trap cleanup EXIT

# Build hook input JSON. session_id is the output filename stem, transcript_path
# tells activity.sh where to read tool_use events from.
make_hook_input() {
  local sid="$1" transcript="$2"
  jq -nc \
    --arg sid "$sid" \
    --arg t "$transcript" \
    '{hook_event_name:"Stop",session_id:$sid,transcript_path:$t,stop_reason:"end_turn"}'
}

# Run activity.sh in an isolated scratch dir. $1 = hook input JSON, $2 = out_dir.
run_activity() {
  local input_json="$1" out_dir="$2"
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input_json" | \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr"
}

# ---------- T-004 (FR-005, FR-006) ---------------------------------------

test_t004_activity_extracts_all_tool_kinds() {
  echo "T-004: activity.sh parses Edit / Write / TodoWrite / git commit from history.jsonl"
  # Given: fixture transcript with Edit, Write, TodoWrite, git-commit Bash, plus
  # a non-commit Bash (ls) that must be ignored.
  local sid="test-004"
  local out_dir="$TMPDIR_BASE/t004"
  mkdir -p "$out_dir"
  local input
  input=$(make_hook_input "$sid" "$FIXTURE_HISTORY")

  # When: activity.sh runs against the fixture transcript
  local exit_code=0
  run_activity "$input" "$out_dir" || exit_code=$?

  assert_eq "T-004 exit code 0 (fail-open)" "0" "$exit_code"

  local jsonl="$out_dir/kdir/activity/$sid.jsonl"
  if [[ ! -f "$jsonl" ]]; then
    echo "  FAIL: T-004 activity jsonl not generated at $jsonl"
    FAIL=$((FAIL + 1))
    return
  fi

  local body; body=$(cat "$jsonl")
  assert_contains "T-004 captures Edit"       '"tool":"Edit"'       "$body"
  assert_contains "T-004 captures Write"      '"tool":"Write"'      "$body"
  assert_contains "T-004 captures TodoWrite"  '"tool":"TodoWrite"'  "$body"
  assert_contains "T-004 captures git commit" '"tool":"GitCommit"'  "$body"
  assert_not_contains "T-004 ignores non-commit Bash (ls)" '"command":"ls -la"' "$body"

  # FR-006: each line is valid JSON and has tool + timestamp keys.
  local total ok_tool ok_ts
  total=$(wc -l < "$jsonl" | tr -d ' ')
  ok_tool=$(jq -c '.tool' < "$jsonl" 2>/dev/null | grep -c '"')
  ok_ts=$(jq -c '.timestamp' < "$jsonl" 2>/dev/null | grep -c '"')
  assert_eq "T-004 every line has tool key"      "$total" "$ok_tool"
  assert_eq "T-004 every line has timestamp key" "$total" "$ok_ts"
}

# ---------- T-005 (FR-005 isolation) -------------------------------------

test_t005_activity_independent_of_extract_failure() {
  echo "T-005: activity.sh runs even when extract.sh fails (independent hook entries)"
  # Given: fixture transcript and a sentinel pretending extract.sh just failed
  # (we set REFLECT_EXTRACT_LAST_EXIT=1, but activity.sh must ignore it — each
  # hook entry is an independent process in Claude Code's contract).
  local sid="test-005"
  local out_dir="$TMPDIR_BASE/t005"
  mkdir -p "$out_dir"
  local input
  input=$(make_hook_input "$sid" "$FIXTURE_HISTORY")

  # When: activity.sh runs with the (irrelevant) sentinel
  local exit_code=0
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    REFLECT_EXTRACT_LAST_EXIT=1 \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr" || exit_code=$?

  assert_eq "T-005 exit code 0" "0" "$exit_code"

  local jsonl="$out_dir/kdir/activity/$sid.jsonl"
  if [[ ! -f "$jsonl" ]]; then
    echo "  FAIL: T-005 activity jsonl missing — depended on extract"
    FAIL=$((FAIL + 1))
    return
  fi
  local body; body=$(cat "$jsonl")
  assert_contains "T-005 captures Edit even after extract fail" '"tool":"Edit"' "$body"
}

# ---------- FR-009: recursion guard --------------------------------------

test_recursion_guard_skips_activity() {
  echo "FR-009: REFLECT_HOOK_SESSION=1 -> activity.sh exits 0 immediately, no jsonl written"
  local sid="test-rec"
  local out_dir="$TMPDIR_BASE/rec"
  mkdir -p "$out_dir"
  local input
  input=$(make_hook_input "$sid" "$FIXTURE_HISTORY")

  local exit_code=0
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    REFLECT_HOOK_SESSION=1 \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr" || exit_code=$?

  assert_eq "FR-009 activity exit 0 under guard" "0" "$exit_code"
  if [[ -e "$out_dir/kdir/activity/$sid.jsonl" ]]; then
    echo "  FAIL: FR-009 activity jsonl created despite recursion guard"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: FR-009 no activity jsonl under guard"
    PASS=$((PASS + 1))
  fi
}

# ---------- FR-V001 analog: missing transcript_path ----------------------

test_missing_transcript_path() {
  echo "FR-V001: hook input missing transcript_path -> stderr diagnostic + exit 0"
  local sid="test-mtp"
  local out_dir="$TMPDIR_BASE/mtp"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" \
    '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  local exit_code=0
  run_activity "$input" "$out_dir" || exit_code=$?

  assert_eq "missing transcript_path exit 0 (fail-open)" "0" "$exit_code"
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  assert_contains "stderr mentions transcript_path" "transcript_path" "$stderr_body"
  if compgen -G "$out_dir/kdir/activity/*.jsonl" >/dev/null; then
    echo "  FAIL: activity jsonl should not be created without transcript"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: no activity jsonl created on missing transcript"
    PASS=$((PASS + 1))
  fi
}

# ---------- FR-V001 analog: missing session_id ---------------------------

test_missing_session_id_activity() {
  echo "FR-V001: hook input missing session_id -> stderr diagnostic + exit 0"
  local out_dir="$TMPDIR_BASE/msi"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg t "$FIXTURE_HISTORY" \
    '{hook_event_name:"Stop",transcript_path:$t,stop_reason:"end_turn"}')

  local exit_code=0
  run_activity "$input" "$out_dir" || exit_code=$?

  assert_eq "missing session_id exit 0 (fail-open)" "0" "$exit_code"
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  assert_contains "stderr mentions session_id" "session_id" "$stderr_body"
}

# ---------- FR-006: per-line JSONL validity ------------------------------

test_jsonl_per_line_validity() {
  echo "FR-006: every output line is valid JSON with tool + timestamp keys"
  local sid="test-validity"
  local out_dir="$TMPDIR_BASE/validity"
  mkdir -p "$out_dir"
  local input
  input=$(make_hook_input "$sid" "$FIXTURE_HISTORY")

  local exit_code=0
  run_activity "$input" "$out_dir" || exit_code=$?
  assert_eq "validity exit 0" "0" "$exit_code"

  local jsonl="$out_dir/kdir/activity/$sid.jsonl"
  if [[ ! -f "$jsonl" ]]; then
    echo "  FAIL: validity test needs the jsonl file"
    FAIL=$((FAIL + 1))
    return
  fi

  # Each line must parse as JSON.
  local bad
  bad=$(jq -c . < "$jsonl" 2>&1 >/dev/null | grep -c . || true)
  assert_eq "every line parses as JSON (0 errors)" "0" "$bad"

  # Each parsed line must have non-null tool and timestamp.
  local total ok
  total=$(wc -l < "$jsonl" | tr -d ' ')
  ok=$(jq -c 'select(.tool != null and .timestamp != null) | .tool' < "$jsonl" 2>/dev/null | grep -c '"' || true)
  assert_eq "every line has tool + timestamp" "$total" "$ok"
}

# ---------- Pre-flight: confirm target absent (Red sanity) ---------------

preflight_red_phase() {
  echo "=== Red-phase preflight: target file should NOT exist yet ==="
  if [[ -e "$HOOK" ]]; then
    echo "  NOTE: target already exists: $HOOK (Green may be in progress)"
  else
    echo "  OK:   missing as expected: $HOOK"
  fi
  echo ""
}

echo "=== reflection-activity.sh Phase 2 tests ==="
preflight_red_phase

test_t004_activity_extracts_all_tool_kinds
test_t005_activity_independent_of_extract_failure
test_recursion_guard_skips_activity
test_missing_transcript_path
test_missing_session_id_activity
test_jsonl_per_line_validity

report_results
