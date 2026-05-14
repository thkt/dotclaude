#!/bin/zsh
# Stop hook: extract mechanical activity log from session transcript.
# LLM-free, deterministic. Reads tool_use events from history.jsonl and writes
# one JSONL line per Edit / Write / TodoWrite / git commit invocation.
# Policy: fail-open. Any error path leads to exit 0; runs independently of
# reflection-extract.sh (FR-004 / BR-004 failure isolation).

set -uo pipefail

# Recursion guard: when invoked from within a subagent process, exit
# immediately so this script never re-enters from a child session.
[[ -n "${REFLECT_HOOK_SESSION:-}" ]] && exit 0

SCRIPT_NAME="reflection-activity.sh"
SCRIPT_PATH="${0:A}"
# ${SCRIPT_PATH:h:h} == hooks/lifecycle/.. == <plugin-root>/hooks/
LIB="${SCRIPT_PATH:h:h}/lib/reflection.sh"

if [[ ! -f "$LIB" ]]; then
  # Inline diag because log_diag itself lives in the missing lib.
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  printf '%s %s helper lib not found: %s\n' "$ts" "$SCRIPT_NAME" "$LIB" >&2
  exit 0
fi
source "$LIB"

HOOK_INPUT=$(cat)

# FR-V001 analog: session_id missing -> diagnose + exit 0
SESSION_ID=$(jq_field "$HOOK_INPUT" "session_id")
if [[ -z "$SESSION_ID" ]]; then
  log_diag "$SCRIPT_NAME" "session_id missing from hook input"
  exit 0
fi

# transcript_path is required to read history.jsonl
TRANSCRIPT_PATH=$(jq_field "$HOOK_INPUT" "transcript_path")
if [[ -z "$TRANSCRIPT_PATH" ]]; then
  log_diag "$SCRIPT_NAME" "transcript_path missing from hook input"
  exit 0
fi
if [[ ! -f "$TRANSCRIPT_PATH" ]]; then
  log_diag "$SCRIPT_NAME" "transcript_path not found at $TRANSCRIPT_PATH"
  exit 0
fi

# FR-V002 analog: activity dir mkdir fail -> diagnose + exit 0
KNOWLEDGE_DIR=$(resolve_knowledge_dir "$HOOK_INPUT")
ACT_DIR="$KNOWLEDGE_DIR/activity"
if ! mkdir -p "$ACT_DIR" 2>/dev/null; then
  log_diag "$SCRIPT_NAME" "activity directory mkdir failed at $ACT_DIR (permission denied)"
  exit 0
fi

JSONL="$ACT_DIR/$SESSION_ID.jsonl"

if ! command -v jq >/dev/null 2>&1; then
  log_diag "$SCRIPT_NAME" "jq command not available on PATH"
  exit 0
fi

# Extract tool_use events from the transcript.
# Output one line per invocation:
#   Edit / Write     -> {tool, timestamp, path}
#   TodoWrite        -> {tool, timestamp, subject}    (flattened per todo)
#   Bash git commit  -> {tool: "GitCommit", timestamp, message}
# Non-commit Bash and other tool_use events are intentionally skipped (out of
# scope per FR-005). Errors during jq parsing are swallowed (fail-open).
jq -c '
  select(.type == "assistant") |
  (.timestamp // "") as $ts |
  (.message.content // [])[]? |
  select(.type == "tool_use") |
  if (.name == "Edit" or .name == "Write") then
    {tool: .name, timestamp: $ts, path: (.input.file_path // "")}
  elif .name == "TodoWrite" then
    (.input.todos // [])[]? |
    {tool: "TodoWrite", timestamp: $ts, subject: (.subject // "")}
  elif (.name == "Bash" and ((.input.command // "") | startswith("git commit"))) then
    {tool: "GitCommit", timestamp: $ts, message: (.input.command // "")}
  else empty end
' "$TRANSCRIPT_PATH" > "$JSONL" 2>/dev/null || true

exit 0
