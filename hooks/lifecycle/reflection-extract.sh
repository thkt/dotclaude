#!/bin/zsh
# Stop hook: extract reflection via subagent and persist per session_id.
# Policy: fail-open. Any error path leads to exit 0 so notify-stop.sh and
# downstream hook entries are not blocked.

set -uo pipefail

# Recursion guard: when invoked from within the subagent process itself,
# exit immediately so a child Stop hook cannot reenter the extraction.
[[ -n "${REFLECT_HOOK_SESSION:-}" ]] && exit 0

SCRIPT_NAME="reflection-extract.sh"
SCRIPT_PATH="${0:A}"
# ${SCRIPT_PATH:h:h}   == hooks/lifecycle/..    == <plugin-root>/hooks/
# ${SCRIPT_PATH:h:h:h} == hooks/lifecycle/../.. == <plugin-root>/ (repo root)
LIB="${SCRIPT_PATH:h:h}/lib/reflection.sh"

if [[ ! -f "$LIB" ]]; then
  # Inline diag because log_diag itself lives in the missing lib.
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  printf '%s %s helper lib not found: %s\n' "$ts" "$SCRIPT_NAME" "$LIB" >&2
  exit 0
fi
source "$LIB"

HOOK_INPUT=$(cat)

# Parse session_id (FR-V001: missing -> diagnose + exit 0)
SESSION_ID=$(jq_field "$HOOK_INPUT" "session_id")
if [[ -z "$SESSION_ID" ]]; then
  log_diag "$SCRIPT_NAME" "session_id missing from hook input"
  exit 0
fi

# Resolve knowledge dir + create (FR-V002: mkdir fail -> diagnose + exit 0)
KNOWLEDGE_DIR=$(resolve_knowledge_dir "$HOOK_INPUT")
REFL_DIR="$KNOWLEDGE_DIR/reflection"
INDEX="$KNOWLEDGE_DIR/reflection-index.jsonl"

if ! mkdir -p "$REFL_DIR" 2>/dev/null; then
  log_diag "$SCRIPT_NAME" "knowledge directory mkdir failed at $REFL_DIR (permission denied)"
  exit 0
fi

MD_FILE="$REFL_DIR/$SESSION_ID.md"

# Path passed to the subagent so a recursive child spawn (T-010) resolves to
# this same script. Tests override via REFLECT_HOOK_EXTRACT_SH.
HOOK_PATH_FOR_CHILD="${REFLECT_HOOK_EXTRACT_SH:-$SCRIPT_PATH}"
PLUGIN_ROOT="${SCRIPT_PATH:h:h:h}"
TIMEOUT_SEC="${REFLECT_SUBAGENT_TIMEOUT:-25}"

# Common env block for the subagent: recursion guard + path overrides.
typeset -a SUBAGENT_ENV
SUBAGENT_ENV=(
  "REFLECT_HOOK_SESSION=1"
  "REFLECT_KNOWLEDGE_DIR=$KNOWLEDGE_DIR"
  "REFLECT_SESSION_ID=$SESSION_ID"
  "REFLECT_HOOK_EXTRACT_SH=$HOOK_PATH_FOR_CHILD"
)

# Common subagent invocation. Test PATH-injects this as a mock `claude`.
typeset -a SUBAGENT_CMD
SUBAGENT_CMD=(
  claude --bare -p
  --permission-mode bypassPermissions
  --plugin-dir "$PLUGIN_ROOT"
  "/reflection-extractor $SESSION_ID"
)

T_START=$(date +%s)
SUBAGENT_EXIT=0
TIMEOUT_BIN=$(command -v gtimeout || command -v timeout || true)

if [[ -n "$TIMEOUT_BIN" ]]; then
  env "${SUBAGENT_ENV[@]}" "$TIMEOUT_BIN" "${TIMEOUT_SEC}s" "${SUBAGENT_CMD[@]}" \
    >/dev/null 2>&1 || SUBAGENT_EXIT=$?
else
  # Pure-zsh fallback: background subagent + sleep-kill watchdog.
  # Note: a 0..TIMEOUT_SEC second stray `sleep` process may briefly survive
  # after an early subagent exit. Harmless (it terminates naturally) and the
  # gtimeout/timeout path is preferred whenever available.
  env "${SUBAGENT_ENV[@]}" "${SUBAGENT_CMD[@]}" >/dev/null 2>&1 &
  SUBAGENT_PID=$!
  ( sleep "$TIMEOUT_SEC" && kill -TERM "$SUBAGENT_PID" 2>/dev/null ) &
  WATCHDOG_PID=$!
  wait "$SUBAGENT_PID" 2>/dev/null
  SUBAGENT_EXIT=$?
  kill "$WATCHDOG_PID" 2>/dev/null || true
fi

T_END=$(date +%s)
ELAPSED=$(( T_END - T_START ))

# Subagent failure diagnostics (FR-004, FR-V003, NFR-006).
# Timeout exit codes:
#   124 — gtimeout/timeout's own "duration exceeded" signal
#   137 — child killed by SIGKILL (128+9)
#   143 — child killed by SIGTERM (128+15), our zsh fallback `kill -TERM` path
if [[ "$SUBAGENT_EXIT" -eq 124 || "$SUBAGENT_EXIT" -eq 137 || "$SUBAGENT_EXIT" -eq 143 ]]; then
  log_diag "$SCRIPT_NAME" "subagent timeout exceeded ${TIMEOUT_SEC}s elapsed_ms=$(( ELAPSED * 1000 ))"
elif [[ "$SUBAGENT_EXIT" -ne 0 ]]; then
  log_diag "$SCRIPT_NAME" "subagent failure exit=$SUBAGENT_EXIT elapsed_ms=$(( ELAPSED * 1000 ))"
fi

# Fallback placeholder if subagent did not write the md (FR-003)
if [[ ! -f "$MD_FILE" ]]; then
  write_placeholder_md "$MD_FILE" "$SESSION_ID"
fi

# Always append index entry (FR-007 consumes this)
append_index_entry "$INDEX" "$SESSION_ID" "$MD_FILE"

exit 0
