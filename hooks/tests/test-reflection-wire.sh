#!/usr/bin/env bash
# Phase 5 wire-up + AC verification for Stop hook Knowledge Reflection.
#
# Scope (Phase 5 of Spec 2026-05-14-stop-hook-reflection):
#   - settings.json wires the 3 new hook scripts.
#   - AC-5 cache safety (auto-loaded path immutability):
#       T-011 (mtime invariant), T-012a (memory grep), T-012b (paths grep)
#   - NFR-001 (Stop hook total latency budget): T-014
#   - NFR-007 (hardcode portability): T-016

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SETTINGS="$REPO_ROOT/settings.json"

EXTRACT="$REPO_ROOT/hooks/lifecycle/reflection-extract.sh"
ACTIVITY="$REPO_ROOT/hooks/lifecycle/reflection-activity.sh"
INJECT="$REPO_ROOT/hooks/lifecycle/reflection-inject.sh"

TMPDIR_BASE="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_BASE" 2>/dev/null || true' EXIT

# ---------- wire-config: settings.json references the 3 hooks ------------

test_wire_stop_extract() {
  echo "wire: settings.json Stop[] references reflection-extract.sh"
  if jq -e '.hooks.Stop[]?.hooks[]? | select(.command | test("reflection-extract\\.sh"))' \
       "$SETTINGS" >/dev/null 2>&1; then
    echo "  PASS: Stop entry for reflection-extract.sh present"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: settings.json Stop missing reflection-extract.sh"
    FAIL=$((FAIL + 1))
  fi
}

test_wire_stop_activity() {
  echo "wire: settings.json Stop[] references reflection-activity.sh"
  if jq -e '.hooks.Stop[]?.hooks[]? | select(.command | test("reflection-activity\\.sh"))' \
       "$SETTINGS" >/dev/null 2>&1; then
    echo "  PASS: Stop entry for reflection-activity.sh present"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: settings.json Stop missing reflection-activity.sh"
    FAIL=$((FAIL + 1))
  fi
}

test_wire_sessionstart_inject() {
  echo "wire: settings.json SessionStart[] references reflection-inject.sh"
  if jq -e '.hooks.SessionStart[]?.hooks[]? | select(.command | test("reflection-inject\\.sh"))' \
       "$SETTINGS" >/dev/null 2>&1; then
    echo "  PASS: SessionStart entry for reflection-inject.sh present"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: settings.json SessionStart missing reflection-inject.sh"
    FAIL=$((FAIL + 1))
  fi
}

test_wire_stop_order_notify_first() {
  echo "wire: notify-stop.sh fires before reflection-extract.sh (independent ordering)"
  # Pull the flat list of command strings under Stop[].hooks[].command, in order.
  local order
  order=$(jq -r '.hooks.Stop[]?.hooks[]?.command' "$SETTINGS" 2>/dev/null)
  local notify_line; notify_line=$(echo "$order" | grep -n "notify-stop\.sh" | head -1 | cut -d: -f1)
  local extract_line; extract_line=$(echo "$order" | grep -n "reflection-extract\.sh" | head -1 | cut -d: -f1)
  if [[ -n "$notify_line" && -n "$extract_line" && "$notify_line" -lt "$extract_line" ]]; then
    echo "  PASS: notify-stop.sh appears before reflection-extract.sh"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: notify-stop.sh must precede reflection-extract.sh (notify=$notify_line extract=$extract_line)"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-011 (FR-010 cache safety: mtime invariant) -----------------

test_t011_auto_loaded_mtime_invariant() {
  echo "T-011 (FR-010, NFR-004): hook run does not modify CLAUDE.md / rules / MEMORY.md"
  local kdir="$TMPDIR_BASE/t011/kdir"
  mkdir -p "$kdir"

  local cmd_md="$REPO_ROOT/CLAUDE.md"
  local rules_dir="$REPO_ROOT/rules"
  local memory="$REPO_ROOT/projects/-Users-thkt--claude/memory/MEMORY.md"

  # Baseline mtimes
  local before_cmd=""; [[ -f "$cmd_md" ]] && before_cmd=$(stat -f %m "$cmd_md")
  local before_mem=""; [[ -f "$memory" ]] && before_mem=$(stat -f %m "$memory")
  local before_rules=""; [[ -d "$rules_dir" ]] && before_rules=$(find "$rules_dir" -name "*.md" -exec stat -f %m {} \; 2>/dev/null | md5)

  # Drive: extract.sh (with mock subagent), activity.sh (against the sample
  # fixture), inject.sh (against the seeded index). All scoped to $kdir so
  # nothing they write touches the real harness.
  local mock_bin="$TMPDIR_BASE/t011/mockbin"; mkdir -p "$mock_bin"
  cp "$SCRIPT_DIR/fixtures/mock-claude.sh" "$mock_bin/claude"
  chmod +x "$mock_bin/claude"

  local sid="t011"
  local input
  input=$(jq -nc --arg sid "$sid" --arg t "$SCRIPT_DIR/fixtures/sample-history.jsonl" \
    '{hook_event_name:"Stop",session_id:$sid,transcript_path:$t,stop_reason:"end_turn"}')
  printf '%s' "$input" | PATH="$mock_bin:$PATH" REFLECT_KNOWLEDGE_DIR="$kdir" MOCK_CLAUDE_MODE=success "$EXTRACT" >/dev/null 2>&1 || true
  printf '%s' "$input" | REFLECT_KNOWLEDGE_DIR="$kdir" "$ACTIVITY" >/dev/null 2>&1 || true
  printf '{"hook_event_name":"SessionStart","session_id":"new","source":"startup"}' \
    | REFLECT_KNOWLEDGE_DIR="$kdir" "$INJECT" >/dev/null 2>&1 || true

  # Post-run mtimes
  local after_cmd=""; [[ -f "$cmd_md" ]] && after_cmd=$(stat -f %m "$cmd_md")
  local after_mem=""; [[ -f "$memory" ]] && after_mem=$(stat -f %m "$memory")
  local after_rules=""; [[ -d "$rules_dir" ]] && after_rules=$(find "$rules_dir" -name "*.md" -exec stat -f %m {} \; 2>/dev/null | md5)

  assert_eq "T-011 CLAUDE.md mtime unchanged" "$before_cmd" "$after_cmd"
  assert_eq "T-011 MEMORY.md mtime unchanged" "$before_mem" "$after_mem"
  assert_eq "T-011 rules/*.md mtime aggregate unchanged" "$before_rules" "$after_rules"
}

# ---------- T-012a (FR-011 memory grep) ----------------------------------

test_t012a_no_knowledge_link_in_memory() {
  echo "T-012a (FR-011): memory/ has no 'knowledge/' references"
  local mem="$REPO_ROOT/projects/-Users-thkt--claude/memory"
  if [[ ! -d "$mem" ]]; then
    echo "  SKIP: memory dir not present"
    return
  fi
  local count
  count=$(grep -rE 'knowledge/' "$mem" 2>/dev/null | wc -l | tr -d ' ')
  assert_eq "T-012a 0 hits under memory/" "0" "$count"
}

# ---------- T-012b (FR-011 paths frontmatter grep) -----------------------

test_t012b_no_paths_attaches_knowledge() {
  echo "T-012b (FR-011, AC-5#3): no 'paths:' frontmatter attaches knowledge/"
  local count
  count=$(grep -rE '^paths:.*knowledge/' \
            "$REPO_ROOT/rules" "$REPO_ROOT/agents" "$REPO_ROOT/skills" \
            "$REPO_ROOT/CLAUDE.md" 2>/dev/null | wc -l | tr -d ' ')
  assert_eq "T-012b 0 hits across rules/agents/skills/CLAUDE.md" "0" "$count"
}

# ---------- T-014 (NFR-001 Stop hook total latency) ----------------------

test_t014_stop_hook_total_latency() {
  echo "T-014 (NFR-001): notify + extract + activity total < 30,000ms"
  local kdir="$TMPDIR_BASE/t014/kdir"
  mkdir -p "$kdir"
  local mock_bin="$TMPDIR_BASE/t014/mockbin"; mkdir -p "$mock_bin"
  cp "$SCRIPT_DIR/fixtures/mock-claude.sh" "$mock_bin/claude"
  chmod +x "$mock_bin/claude"

  local sid="t014"
  local input
  input=$(jq -nc --arg sid "$sid" --arg t "$SCRIPT_DIR/fixtures/sample-history.jsonl" \
    '{hook_event_name:"Stop",session_id:$sid,transcript_path:$t,stop_reason:"end_turn"}')

  local t_start; t_start=$(python3 -c 'import time; print(int(time.time()*1000))')
  # notify-stop.sh has side-effects (sound) — skip in test, measure only the
  # reflection hooks. T-014 enforces the budget the reflection pipeline adds.
  printf '%s' "$input" | PATH="$mock_bin:$PATH" REFLECT_KNOWLEDGE_DIR="$kdir" MOCK_CLAUDE_MODE=success "$EXTRACT" >/dev/null 2>&1 || true
  printf '%s' "$input" | REFLECT_KNOWLEDGE_DIR="$kdir" "$ACTIVITY" >/dev/null 2>&1 || true
  local t_end; t_end=$(python3 -c 'import time; print(int(time.time()*1000))')
  local elapsed_ms=$(( t_end - t_start ))

  if (( elapsed_ms < 30000 )); then
    echo "  PASS: T-014 elapsed ${elapsed_ms}ms within 30,000ms budget"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: T-014 elapsed ${elapsed_ms}ms exceeds 30,000ms"
    FAIL=$((FAIL + 1))
  fi
}

# ---------- T-016 (NFR-007 portability hardcode grep) --------------------

test_t016_no_home_claude_hardcode() {
  echo "T-016 (NFR-007): hooks/lifecycle/reflection-*.sh has 0 ~/.claude or \$HOME/.claude hardcode"
  local home_hits tilde_hits
  home_hits=$(grep -nE '\$HOME/\.claude' \
                "$REPO_ROOT/hooks/lifecycle/reflection-extract.sh" \
                "$REPO_ROOT/hooks/lifecycle/reflection-activity.sh" \
                "$REPO_ROOT/hooks/lifecycle/reflection-inject.sh" \
                2>/dev/null | wc -l | tr -d ' ')
  tilde_hits=$(grep -nE '~/\.claude' \
                 "$REPO_ROOT/hooks/lifecycle/reflection-extract.sh" \
                 "$REPO_ROOT/hooks/lifecycle/reflection-activity.sh" \
                 "$REPO_ROOT/hooks/lifecycle/reflection-inject.sh" \
                 2>/dev/null | wc -l | tr -d ' ')
  assert_eq "T-016 \$HOME/.claude hits = 0"   "0" "$home_hits"
  assert_eq "T-016 ~/.claude hits = 0"        "0" "$tilde_hits"
}

echo "=== reflection wire + AC verification (Phase 5) ==="
test_wire_stop_extract
test_wire_stop_activity
test_wire_sessionstart_inject
test_wire_stop_order_notify_first
test_t011_auto_loaded_mtime_invariant
test_t012a_no_knowledge_link_in_memory
test_t012b_no_paths_attaches_knowledge
test_t014_stop_hook_total_latency
test_t016_no_home_claude_hardcode

report_results
