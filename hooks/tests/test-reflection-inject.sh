#!/usr/bin/env bash
# Phase 3 tests for SessionStart reflection-inject pipeline.
#
# Scope (Phase 3 of Spec 2026-05-14-stop-hook-reflection):
#   Cover FRs : FR-007, FR-008, FR-012
#   Cover T-NNN: T-006, T-007, T-008, T-013
#   Cover FR-009 (recursion guard) for inject.sh
#   Cover NFR-002 (SessionStart latency < 1000ms)
#
# Target (Red phase — file not expected yet):
#   ~/.claude/hooks/lifecycle/reflection-inject.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$REPO_ROOT/hooks/lifecycle/reflection-inject.sh"

TMPDIR_BASE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_BASE" 2>/dev/null || true' EXIT

# seed_reflections <kdir> <count>
# Create count synthetic reflection .md files and a matching index.
seed_reflections() {
  local kdir="$1" count="$2"
  local refl_dir="$kdir/reflection"
  local index="$kdir/reflection-index.jsonl"
  mkdir -p "$refl_dir"
  : > "$index"
  local i
  for ((i = 1; i <= count; i++)); do
    local sid
    sid=$(printf 'ses-%03d' "$i")
    local md="$refl_dir/$sid.md"
    cat > "$md" <<EOF
---
session_id: $sid
confidence: confirmed
categories: [realization]
word_count: 5
---

## Realization
Reflection body for $sid.
EOF
    printf '{"session_id":"%s","reflection_file":"%s","created_at":"2026-05-14T09:00:00Z"}\n' \
      "$sid" "$md" >> "$index"
  done
}

run_inject() {
  local out_dir="$1"
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '{"hook_event_name":"SessionStart","session_id":"new-session","source":"startup"}' | \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    "$HOOK" \
    >"$out_dir/stdout" \
    2>"$out_dir/stderr"
}

# ---------- T-006 (FR-007) ----------------------------------------------

test_t006_cap_at_10() {
  echo "T-006: index of 15 -> stdout includes last 10 only"
  local out_dir="$TMPDIR_BASE/t006"
  mkdir -p "$out_dir"
  seed_reflections "$out_dir/kdir" 15

  local exit_code=0
  run_inject "$out_dir" || exit_code=$?
  assert_eq "T-006 exit 0" "0" "$exit_code"

  local body; body=$(cat "$out_dir/stdout")
  assert_not_contains "T-006 ses-001 excluded" "Reflection body for ses-001" "$body"
  assert_not_contains "T-006 ses-005 excluded" "Reflection body for ses-005" "$body"
  assert_contains     "T-006 ses-006 included" "Reflection body for ses-006" "$body"
  assert_contains     "T-006 ses-015 included" "Reflection body for ses-015" "$body"
}

# ---------- T-007 (FR-008) ----------------------------------------------

test_t007_fewer_than_cap() {
  echo "T-007: index of 3 -> stdout emits all 3"
  local out_dir="$TMPDIR_BASE/t007"
  mkdir -p "$out_dir"
  seed_reflections "$out_dir/kdir" 3

  local exit_code=0
  run_inject "$out_dir" || exit_code=$?
  assert_eq "T-007 exit 0" "0" "$exit_code"

  local body; body=$(cat "$out_dir/stdout")
  assert_contains "T-007 ses-001 included" "Reflection body for ses-001" "$body"
  assert_contains "T-007 ses-002 included" "Reflection body for ses-002" "$body"
  assert_contains "T-007 ses-003 included" "Reflection body for ses-003" "$body"
}

# ---------- T-008 (FR-012) ----------------------------------------------

test_t008_missing_reflection_skipped() {
  echo "T-008: 5-entry index with 2nd file deleted -> stderr warning + 4 emitted + exit 0"
  local out_dir="$TMPDIR_BASE/t008"
  mkdir -p "$out_dir"
  seed_reflections "$out_dir/kdir" 5
  rm "$out_dir/kdir/reflection/ses-002.md"

  local exit_code=0
  run_inject "$out_dir" || exit_code=$?
  assert_eq "T-008 exit 0" "0" "$exit_code"

  local body; body=$(cat "$out_dir/stdout")
  assert_contains     "T-008 ses-001 still included" "Reflection body for ses-001" "$body"
  assert_not_contains "T-008 ses-002 skipped"        "Reflection body for ses-002" "$body"
  assert_contains     "T-008 ses-003 still included" "Reflection body for ses-003" "$body"

  local stderr_body; stderr_body=$(cat "$out_dir/stderr")
  assert_contains "T-008 stderr warns about missing ses-002" "ses-002" "$stderr_body"
}

# ---------- T-013 (NFR-002 latency budget) ------------------------------

test_t013_latency_under_1s() {
  echo "T-013 (NFR-002): 10 reflections, 5 sequential invocations, each < 1000ms"
  local out_dir="$TMPDIR_BASE/t013"
  mkdir -p "$out_dir"
  seed_reflections "$out_dir/kdir" 10
  local exit_code=0
  local i
  for ((i = 1; i <= 5; i++)); do
    local t_start; t_start=$(python3 -c 'import time; print(int(time.time()*1000))')
    run_inject "$out_dir" || exit_code=$?
    local t_end; t_end=$(python3 -c 'import time; print(int(time.time()*1000))')
    local elapsed_ms=$(( t_end - t_start ))
    if (( elapsed_ms < 1000 )); then
      echo "  PASS: T-013 iter $i elapsed ${elapsed_ms}ms"
      PASS=$((PASS + 1))
    else
      echo "  FAIL: T-013 iter $i elapsed ${elapsed_ms}ms exceeds 1000ms"
      FAIL=$((FAIL + 1))
    fi
  done
  assert_eq "T-013 all 5 exit 0" "0" "$exit_code"
}

# ---------- Index absent: silent --------------------------------------

test_no_index_silent() {
  echo "FR-007 boundary: index missing -> empty stdout, exit 0"
  local out_dir="$TMPDIR_BASE/none"
  mkdir -p "$out_dir/kdir"
  local exit_code=0
  run_inject "$out_dir" || exit_code=$?
  assert_eq "no-index exit 0" "0" "$exit_code"
  local body; body=$(cat "$out_dir/stdout")
  assert_eq "no-index empty stdout" "" "$body"
}

# ---------- FR-009: recursion guard ----------------------------------

test_recursion_guard_inject() {
  echo "FR-009: REFLECT_HOOK_SESSION=1 -> inject.sh exits 0, empty stdout"
  local out_dir="$TMPDIR_BASE/rec"
  mkdir -p "$out_dir"
  seed_reflections "$out_dir/kdir" 3

  local exit_code=0
  : > "$out_dir/stdout"
  : > "$out_dir/stderr"
  printf '{"hook_event_name":"SessionStart","session_id":"x","source":"startup"}' | \
    REFLECT_KNOWLEDGE_DIR="$out_dir/kdir" \
    REFLECT_HOOK_SESSION=1 \
    "$HOOK" \
    >"$out_dir/stdout" 2>"$out_dir/stderr" || exit_code=$?
  assert_eq "FR-009 inject exit 0 under guard" "0" "$exit_code"
  local body; body=$(cat "$out_dir/stdout")
  assert_eq "FR-009 stdout empty under guard" "" "$body"
}

preflight_red_phase() {
  echo "=== Red-phase preflight: target file should NOT exist yet ==="
  if [[ -e "$HOOK" ]]; then
    echo "  NOTE: target already exists: $HOOK (Green may be in progress)"
  else
    echo "  OK:   missing as expected: $HOOK"
  fi
  echo ""
}

echo "=== reflection-inject.sh Phase 3 tests ==="
preflight_red_phase

test_t006_cap_at_10
test_t007_fewer_than_cap
test_t008_missing_reflection_skipped
test_t013_latency_under_1s
test_no_index_silent
test_recursion_guard_inject

report_results
