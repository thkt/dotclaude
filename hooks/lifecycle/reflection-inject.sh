#!/bin/zsh
# SessionStart hook: inject the most recent reflections into the next session.
# Reads reflection-index.jsonl, takes the tail N entries, and concatenates the
# corresponding reflection .md bodies to stdout. Claude Code surfaces this
# stdout as additionalContext for the new session.
# Policy: fail-open. Missing index / files emit warnings but never block.

set -uo pipefail

# Recursion guard: when invoked from a subagent process, exit immediately so
# nested SessionStart fires do not stack injections.
[[ -n "${REFLECT_HOOK_SESSION:-}" ]] && exit 0

SCRIPT_NAME="reflection-inject.sh"
SCRIPT_PATH="${0:A}"
LIB="${SCRIPT_PATH:h:h}/lib/reflection.sh"

if [[ ! -f "$LIB" ]]; then
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  printf '%s %s helper lib not found: %s\n' "$ts" "$SCRIPT_NAME" "$LIB" >&2
  exit 0
fi
source "$LIB"

# SessionStart hook input is optional; some matchers fire without stdin.
HOOK_INPUT=$(cat 2>/dev/null || true)

KNOWLEDGE_DIR=$(resolve_knowledge_dir "$HOOK_INPUT")
INDEX="$KNOWLEDGE_DIR/reflection-index.jsonl"

# Index missing (first session ever) -> silent exit 0.
[[ ! -f "$INDEX" ]] && exit 0

N="${REFLECT_INJECT_CAP:-10}"

# Read the last N entries. If the index is empty or unreadable, bail silently.
ENTRIES=$(tail -n "$N" "$INDEX" 2>/dev/null) || exit 0
[[ -z "$ENTRIES" ]] && exit 0

# Collect bodies first so we only emit a header if at least one file was found.
EMITTED=0
BUFFER=""

# extract_md_path <jsonl_line>
#   Pull reflection_file out of a single index line. Prefer jq when available;
#   fall back to a defensive sed for jq-less environments.
extract_md_path() {
  local line="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$line" | jq -r '.reflection_file // ""' 2>/dev/null
  else
    printf '%s' "$line" | sed -n 's/.*"reflection_file":"\([^"]*\)".*/\1/p'
  fi
}

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  md_path=$(extract_md_path "$line")
  if [[ -z "$md_path" || "$md_path" == "null" ]]; then
    log_diag "$SCRIPT_NAME" "index entry missing reflection_file: $line"
    continue
  fi
  if [[ ! -f "$md_path" ]]; then
    log_diag "$SCRIPT_NAME" "reflection file missing on disk: $md_path"
    continue
  fi
  BUFFER+="$(cat "$md_path")"$'\n\n---\n\n'
  EMITTED=$((EMITTED + 1))
done <<< "$ENTRIES"

if (( EMITTED == 0 )); then
  exit 0
fi

printf '## Recent Reflections\n\n%s' "$BUFFER"

exit 0
