#!/usr/bin/env bash
# Phase 1 tests for the Stop hook reflection-extract pipeline.
#
# Scope (Phase 1 of Spec 2026-05-14-stop-hook-reflection):
#   Cover FRs : FR-001, FR-002, FR-003, FR-004, FR-009, FR-V001, FR-V002, FR-V003
#   Cover T-NNN: T-001, T-002, T-003, T-009, T-010, T-015
#   Cover NFR : NFR-006 (extract.sh stderr 3 fields on FR-V failure paths)
#
# Targets (Red phase — these files are not expected to exist yet):
#   ~/.claude/hooks/lifecycle/reflection-extract.sh
#   ~/.claude/hooks/lib/reflection.sh
#   ~/.claude/agents/reflection-extractor.md
#
# Test design notes:
#   - subagent is mocked by PATH-injecting fixtures/mock-claude.sh as a binary
#     literally named `claude`. Mock-claude WRITES the reflection .md directly
#     (contract A — matches wiki plugin precedent). extract.sh is responsible
#     for the empty-output fallback path (T-002 / FR-003) and for stderr
#     diagnostics on FR-V001 / FR-V002 / FR-V003.
#   - REFLECT_KNOWLEDGE_DIR overrides the on-disk knowledge dir to a tmp
#     scratch space. The Green implementation must honor this env var.
#   - REFLECT_HOOK_SESSION=1 is the recursion guard; under it extract.sh
#     SHALL exit 0 immediately without invoking the subagent (FR-009 / T-009).
#   - REFLECT_SUBAGENT_TIMEOUT overrides the production 25s budget so the
#     timeout path (FR-V003 / T-015 timeout case) can be exercised in ~2s.
#   - All hook invocations are wrapped with `|| exit_code=$?` so the test
#     harness survives missing implementations during the Red phase.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/lifecycle/reflection-extract.sh"
LIB="$REPO_ROOT/hooks/lib/reflection.sh"
AGENT_PROMPT="$REPO_ROOT/agents/reflection-extractor.md"

TMPDIR_BASE="$(mktemp -d)"
MOCK_BIN_DIR="$TMPDIR_BASE/mock-bin"
KNOWLEDGE_DIR_BASE="$TMPDIR_BASE/knowledge"
mkdir -p "$MOCK_BIN_DIR" "$KNOWLEDGE_DIR_BASE"

cleanup() { rm -rf "$TMPDIR_BASE"; }
trap cleanup EXIT

# Install mock-claude into PATH under the literal name `claude` so that
# `claude --bare ...` inside extract.sh resolves to the stub. The Green
# implementation MUST invoke claude via the PATH-resolved name (not an
# absolute path), otherwise this injection is bypassed and the test
# becomes a no-op.
setup_mock_claude() {
  cp "$SCRIPT_DIR/fixtures/mock-claude.sh" "$MOCK_BIN_DIR/claude"
  chmod +x "$MOCK_BIN_DIR/claude"
}

# Build a per-test knowledge dir so cross-test state never leaks. Returns
# the dir path on stdout.
fresh_knowledge_dir() {
  local sub
  sub=$(mktemp -d "$KNOWLEDGE_DIR_BASE/k.XXXXXX")
  printf '%s' "$sub"
}

# Run extract.sh with a fully scoped environment. Reads stdin JSON from
# arg $1, writes stdout/stderr to files in $2. Returns the script's exit
# code (0 if missing — `|| exit_code=$?` is used at the call site).
#
# Contract for Green-phase implementor (T-010 / FR-009 recursion guard):
#   extract.sh MUST export REFLECT_HOOK_SESSION=1 (and propagate
#   REFLECT_KNOWLEDGE_DIR, REFLECT_HOOK_EXTRACT_SH) into the subagent
#   invocation, mirroring wiki plugin's `WIKI_HOOK_SESSION=1 claude --bare ...`
#   pattern. Without that propagation, a recursive child invocation cannot
#   short-circuit and T-010 will hang up to its 5s watchdog.
run_extract() {
  local input_json="$1" out_dir="$2"
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input_json" | \
    PATH="$MOCK_BIN_DIR:$PATH" \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    REFLECT_HOOK_EXTRACT_SH="$HOOK" \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr"
}

# ---------- T-001 (FR-001, FR-002) ---------------------------------------

test_t001_extract_writes_md_with_frontmatter() {
  echo "T-001: extract.sh writes per-session_id md with required frontmatter keys"
  # Given: subagent stub in success mode, session_id=test-001
  setup_mock_claude
  local sid="test-001"
  local out_dir="$TMPDIR_BASE/t001"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: extract.sh runs locally with mock-claude on PATH
  local exit_code=0
  MOCK_CLAUDE_MODE=success run_extract "$input" "$out_dir" || exit_code=$?

  # Then: per-session md exists with frontmatter containing all 4 keys
  local md="$out_dir/kdir/reflection/$sid.md"
  if [[ -f "$md" ]]; then
    local body; body=$(cat "$md")
    assert_eq "T-001 exit code 0 (fail-open)" "0" "$exit_code"
    assert_contains "T-001 frontmatter session_id" "session_id: $sid" "$body"
    assert_contains "T-001 frontmatter confidence key present" "confidence:" "$body"
    assert_contains "T-001 frontmatter categories key present" "categories:" "$body"
    assert_contains "T-001 frontmatter word_count key present" "word_count:" "$body"
  else
    echo "  FAIL: T-001 reflection md not generated at $md"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-002 (FR-003) -----------------------------------------------

test_t002_empty_extraction_writes_placeholder() {
  echo "T-002: subagent returns no content -> extract.sh writes frontmatter-only placeholder + index entry"
  # Given: subagent stub in empty mode (writes nothing), session_id=test-002
  setup_mock_claude
  local sid="test-002"
  local out_dir="$TMPDIR_BASE/t002"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: extract.sh runs with empty mock subagent
  local exit_code=0
  MOCK_CLAUDE_MODE=empty run_extract "$input" "$out_dir" || exit_code=$?

  # Then: extract.sh creates a placeholder md (frontmatter only) AND appends
  # one entry to reflection-index.jsonl with matching session_id.
  local md="$out_dir/kdir/reflection/$sid.md"
  local index="$out_dir/kdir/reflection-index.jsonl"
  assert_eq "T-002 exit code 0" "0" "$exit_code"
  if [[ -f "$md" ]]; then
    local body; body=$(cat "$md")
    assert_contains "T-002 placeholder has session_id frontmatter" "session_id: $sid" "$body"
    assert_contains "T-002 placeholder has confidence frontmatter" "confidence:" "$body"
  else
    echo "  FAIL: T-002 placeholder md not generated at $md"
    FAIL=$((FAIL + 1))
  fi
  if [[ -f "$index" ]]; then
    local idx_body; idx_body=$(cat "$index")
    assert_contains "T-002 index has session_id entry" "$sid" "$idx_body"
  else
    echo "  FAIL: T-002 reflection-index.jsonl not created at $index"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-003 (FR-004) -----------------------------------------------

test_t003_extract_fail_notify_independent() {
  echo "T-003: extract.sh exit != 0 must not propagate; downstream hooks run independently"
  # Given: subagent stub fails (exit 1), session_id=test-003
  setup_mock_claude
  local sid="test-003"
  local out_dir="$TMPDIR_BASE/t003"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: extract.sh runs against the failing subagent stub
  local exit_code=0
  MOCK_CLAUDE_MODE=fail run_extract "$input" "$out_dir" || exit_code=$?

  # Then: extract.sh itself MUST return exit 0 (fail-open per FR-004 / BR-004).
  # Independent hook entries (notify-stop.sh) are scheduled by Claude Code as
  # separate processes — extract.sh's contract is to exit 0 so settings.json
  # never wires the failure into a chain.
  assert_eq "T-003 extract.sh exits 0 even when subagent fails" "0" "$exit_code"

  # And: a diagnostic line is emitted to stderr so the failure is observable.
  # Match script name AND a failure keyword on the same line so the shell's own
  # "No such file or directory" error during Red phase cannot spuriously match.
  if grep -E 'reflection-extract\.sh' "$out_dir/stderr" 2>/dev/null | grep -iE 'fail|error|exit|subagent' >/dev/null 2>&1; then
    echo "  PASS: T-003 stderr mentions script + failure keyword"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: T-003 stderr lacks 'reflection-extract.sh' + fail/error/exit/subagent on one line"
    echo "    stderr: $(head -3 "$out_dir/stderr")"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-009 (FR-009) -----------------------------------------------

test_t009_recursion_guard_exits_immediately() {
  echo "T-009: REFLECT_HOOK_SESSION=1 -> extract.sh exits 0 immediately without invoking subagent"
  # Given: recursion guard env is set, subagent stub would otherwise write a file
  setup_mock_claude
  local sid="test-009"
  local out_dir="$TMPDIR_BASE/t009"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: extract.sh runs with REFLECT_HOOK_SESSION=1
  local exit_code=0
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    PATH="$MOCK_BIN_DIR:$PATH" \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    REFLECT_HOOK_SESSION=1 \
    MOCK_CLAUDE_MODE=success \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr" || exit_code=$?

  # Then: exit 0 AND no reflection file written AND mock-claude never ran
  # (mock-claude writes a marker line to stderr on every invocation).
  assert_eq "T-009 exit code 0" "0" "$exit_code"
  if [[ -e "$out_dir/kdir/reflection/$sid.md" ]]; then
    echo "  FAIL: T-009 reflection md was generated despite recursion guard"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: T-009 no reflection md written under recursion guard"
    PASS=$((PASS + 1))
  fi
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  assert_not_contains "T-009 mock-claude not invoked" "mock-claude: mode=" "$stderr_body"
}

# ---------- T-010 (FR-009 integration) -----------------------------------

test_t010_recursive_spawn_no_deadlock() {
  echo "T-010: parent extract.sh -> mock subagent -> child extract.sh terminates within 5s (no deadlock)"
  # Given: mock-claude in `recurse` mode re-invokes extract.sh as a child while
  # REFLECT_HOOK_SESSION=1 is inherited from the parent's subagent spawn step.
  setup_mock_claude
  local sid="test-010"
  local out_dir="$TMPDIR_BASE/t010"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: parent runs under a hard 5s outer watchdog (gtimeout) so a deadlock
  # surfaces as a watchdog kill rather than a hung test suite.
  local exit_code=0
  local timeout_bin; timeout_bin=$(command -v gtimeout || command -v timeout || true)
  if [[ -z "$timeout_bin" ]]; then
    echo "  SKIP: gtimeout/timeout not available; cannot bound T-010"
    FAIL=$((FAIL + 1))
    return
  fi
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    "$timeout_bin" 5s env \
      PATH="$MOCK_BIN_DIR:$PATH" \
      REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
      REFLECT_HOOK_EXTRACT_SH="$HOOK" \
      MOCK_CLAUDE_MODE=recurse \
      "$HOOK" \
      >"$out_dir/stdout" \
      2>"$out_dir/stderr" || exit_code=$?

  # Then: parent exits 0 (gtimeout returns 124 on timeout — that signals the
  # recursion guard failed and the test must FAIL loudly).
  if [[ "$exit_code" == "124" ]]; then
    echo "  FAIL: T-010 watchdog (5s) fired — recursion guard did not break the cycle"
    FAIL=$((FAIL + 1))
  else
    assert_eq "T-010 parent exit code 0" "0" "$exit_code"
  fi
}

# ---------- FR-V001 (T-015 component, fail-open on missing session_id) ----

test_fr_v001_missing_session_id() {
  echo "FR-V001: hook input missing session_id -> stderr diagnostic + exit 0"
  # Given: hook input JSON without a session_id key
  setup_mock_claude
  local out_dir="$TMPDIR_BASE/v001"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc '{hook_event_name:"Stop",stop_reason:"end_turn"}')

  # When: extract.sh runs with the malformed input
  local exit_code=0
  MOCK_CLAUDE_MODE=success run_extract "$input" "$out_dir" || exit_code=$?

  # Then: exit 0 (fail-open) AND stderr contains a diagnostic mentioning the
  # missing session_id. No reflection file is created.
  assert_eq "FR-V001 exit 0 (fail-open)" "0" "$exit_code"
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  assert_contains "FR-V001 stderr mentions session_id" "session_id" "$stderr_body"
  if compgen -G "$out_dir/kdir/reflection/*.md" >/dev/null; then
    echo "  FAIL: FR-V001 reflection md should not be created for missing session_id"
    FAIL=$((FAIL + 1))
  else
    echo "  PASS: FR-V001 no reflection md created"
    PASS=$((PASS + 1))
  fi
}

# ---------- FR-V002 (T-015 component, fail-open on mkdir failure) ---------

test_fr_v002_mkdir_fail() {
  echo "FR-V002: knowledge dir not writable -> stderr diagnostic + exit 0"
  # Given: REFLECT_KNOWLEDGE_DIR points at a path inside a read-only parent so
  # mkdir -p fails. Create a parent dir, chmod it to 0500, then ask extract.sh
  # to create a child under it.
  setup_mock_claude
  local sid="test-v002"
  local out_dir="$TMPDIR_BASE/v002"
  mkdir -p "$out_dir/readonly-parent"
  chmod 0500 "$out_dir/readonly-parent"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')

  # When: extract.sh runs with knowledge dir under the read-only parent
  local exit_code=0
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    PATH="$MOCK_BIN_DIR:$PATH" \
    REFLECT_KNOWLEDGE_DIR="$out_dir/readonly-parent/kdir" \
    MOCK_CLAUDE_MODE=success \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr" || exit_code=$?

  # Restore perms so cleanup() can recurse-delete.
  chmod 0700 "$out_dir/readonly-parent" 2>/dev/null || true

  # Then: exit 0 (fail-open) AND stderr mentions the directory failure.
  assert_eq "FR-V002 exit 0 (fail-open)" "0" "$exit_code"
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  # Accept any of these substrings — Green impl picks one concrete phrasing.
  # `directory` is omitted on purpose so the shell's "No such file or directory"
  # noise during Red phase cannot spuriously match.
  if echo "$stderr_body" | grep -qE 'knowledge|mkdir|permission|writable|denied'; then
    echo "  PASS: FR-V002 stderr surfaces dir creation failure"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: FR-V002 stderr lacks dir-failure diagnostic"
    echo "    stderr: $(head -3 "$out_dir/stderr")"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- FR-V003 (T-015 component, timeout path) -----------------------

test_fr_v003_subagent_timeout() {
  echo "FR-V003: subagent exceeds REFLECT_SUBAGENT_TIMEOUT -> kill + warning + exit 0"
  # Given: mock subagent in `timeout` mode sleeps for 4s; extract.sh's per-run
  # timeout is overridden to 2s via REFLECT_SUBAGENT_TIMEOUT. Outer watchdog
  # (gtimeout 8s) bounds the whole test so a missing impl cannot hang.
  setup_mock_claude
  local sid="test-v003"
  local out_dir="$TMPDIR_BASE/v003"
  mkdir -p "$out_dir"
  local input
  input=$(jq -nc --arg sid "$sid" '{hook_event_name:"Stop",session_id:$sid,stop_reason:"end_turn"}')
  local timeout_bin; timeout_bin=$(command -v gtimeout || command -v timeout || true)
  if [[ -z "$timeout_bin" ]]; then
    echo "  SKIP: gtimeout/timeout not available; cannot bound FR-V003"
    FAIL=$((FAIL + 1))
    return
  fi

  # When: extract.sh runs with timeout knob = 2s, mock sleeps 4s
  local exit_code=0
  local t_start; t_start=$(date +%s)
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '%s' "$input" | \
    "$timeout_bin" 8s env \
      PATH="$MOCK_BIN_DIR:$PATH" \
      REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
      REFLECT_SUBAGENT_TIMEOUT=2 \
      MOCK_CLAUDE_MODE=timeout \
      MOCK_CLAUDE_SLEEP_SEC=4 \
      "$HOOK" \
      >"$out_dir/stdout" \
      2>"$out_dir/stderr" || exit_code=$?
  local t_end; t_end=$(date +%s)
  local elapsed=$(( t_end - t_start ))

  # Then: exit 0 (fail-open), elapsed << 8s (the watchdog upper bound), and
  # stderr contains a timeout-flavored warning.
  if [[ "$exit_code" == "124" ]]; then
    echo "  FAIL: FR-V003 outer watchdog (8s) fired — extract.sh did not enforce its own timeout"
    FAIL=$((FAIL + 1))
    return
  fi
  assert_eq "FR-V003 exit 0 (fail-open)" "0" "$exit_code"
  # Lower bound (>=1s) rejects instant-bail runs where the timeout was never
  # actually enforced; upper bound (<7s) catches a missing kill.
  if (( elapsed >= 1 && elapsed < 7 )); then
    echo "  PASS: FR-V003 elapsed ${elapsed}s within enforced timeout window"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: FR-V003 elapsed ${elapsed}s outside expected [1, 7)s window — timeout not enforced"
    FAIL=$((FAIL + 1))
  fi
  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  if echo "$stderr_body" | grep -qiE 'timeout|timed out|elapsed'; then
    echo "  PASS: FR-V003 stderr surfaces timeout warning"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: FR-V003 stderr lacks timeout warning"
    echo "    stderr: $(head -3 "$out_dir/stderr")"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-015 (NFR-006 stderr 3-field shape on all FR-V paths) --------

# Helper: assert stderr has at least one line containing all 3 fields
# (timestamp-like token + script name + reason keyword).
assert_stderr_3_fields() {
  local label="$1" reason_re="$2" stderr_file="$3"
  # Timestamp pattern: ISO-like (YYYY-...) OR HH:MM:SS. Loose for Red phase.
  local ts_re='([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}:[0-9]{2}:[0-9]{2})'
  local script_re='reflection-extract\.sh'
  if grep -E "$ts_re" "$stderr_file" 2>/dev/null | grep -E "$script_re" 2>/dev/null | grep -iE "$reason_re" >/dev/null 2>&1; then
    echo "  PASS: T-015 [$label] stderr contains timestamp + script + reason on one line"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: T-015 [$label] stderr missing 3-field diagnostic (ts + 'reflection-extract.sh' + /$reason_re/)"
    echo "    stderr: $(head -3 "$stderr_file")"
    FAIL=$((FAIL + 1))
  fi
}

test_t015_stderr_3_fields() {
  echo "T-015 (NFR-006): FR-V001/V002/V003 failure paths emit timestamp + script + reason on stderr"
  setup_mock_claude

  # --- V001: missing session_id ---
  local d1="$TMPDIR_BASE/t015-v001"; mkdir -p "$d1"
  local input1; input1=$(jq -nc '{hook_event_name:"Stop",stop_reason:"end_turn"}')
  local _ec=0
  MOCK_CLAUDE_MODE=success run_extract "$input1" "$d1" || _ec=$?
  assert_stderr_3_fields "FR-V001" "session_id|missing|input" "$d1/stderr"

  # --- V002: mkdir fail ---
  local d2="$TMPDIR_BASE/t015-v002"; mkdir -p "$d2/ro"
  chmod 0500 "$d2/ro"
  local input2; input2=$(jq -nc '{hook_event_name:"Stop",session_id:"t015-v002",stop_reason:"end_turn"}')
  _ec=0
  : > "$d2/stdout"
  : > "$d2/stderr"
  printf '%s' "$input2" | \
    PATH="$MOCK_BIN_DIR:$PATH" \
    REFLECT_KNOWLEDGE_DIR="$d2/ro/kdir" \
    MOCK_CLAUDE_MODE=success \
    "$HOOK" \
    >"$d2/stdout" \
    2>"$d2/stderr" || _ec=$?
  chmod 0700 "$d2/ro" 2>/dev/null || true
  assert_stderr_3_fields "FR-V002" "knowledge|mkdir|permission|directory" "$d2/stderr"

  # --- V003: subagent timeout ---
  local d3="$TMPDIR_BASE/t015-v003"; mkdir -p "$d3"
  local input3; input3=$(jq -nc '{hook_event_name:"Stop",session_id:"t015-v003",stop_reason:"end_turn"}')
  local timeout_bin; timeout_bin=$(command -v gtimeout || command -v timeout || true)
  if [[ -z "$timeout_bin" ]]; then
    echo "  SKIP: T-015 [FR-V003] gtimeout/timeout not available"
    FAIL=$((FAIL + 1))
    return
  fi
  _ec=0
  : > "$d3/stdout"
  : > "$d3/stderr"
  printf '%s' "$input3" | \
    "$timeout_bin" 8s env \
      PATH="$MOCK_BIN_DIR:$PATH" \
      REFLECT_KNOWLEDGE_DIR="$d3/kdir" \
      REFLECT_SUBAGENT_TIMEOUT=2 \
      MOCK_CLAUDE_MODE=timeout \
      MOCK_CLAUDE_SLEEP_SEC=4 \
      "$HOOK" \
      >"$d3/stdout" \
      2>"$d3/stderr" || _ec=$?
  assert_stderr_3_fields "FR-V003" "timeout|timed out|elapsed" "$d3/stderr"
}

# ---------- Pre-flight: confirm target files are absent (Red sanity check) -

preflight_red_phase() {
  echo "=== Red-phase preflight: target files should NOT exist yet ==="
  for f in "$HOOK" "$LIB" "$AGENT_PROMPT"; do
    if [[ -e "$f" ]]; then
      echo "  NOTE: target already exists: $f (Green may be in progress)"
    else
      echo "  OK:   missing as expected: $f"
    fi
  done
  echo ""
}

echo "=== reflection-extract.sh Phase 1 tests ==="
preflight_red_phase

test_t001_extract_writes_md_with_frontmatter
test_t002_empty_extraction_writes_placeholder
test_t003_extract_fail_notify_independent
test_t009_recursion_guard_exits_immediately
test_t010_recursive_spawn_no_deadlock
test_fr_v001_missing_session_id
test_fr_v002_mkdir_fail
test_fr_v003_subagent_timeout
test_t015_stderr_3_fields

report_results
