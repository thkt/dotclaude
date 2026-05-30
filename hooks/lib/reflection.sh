#!/bin/zsh
# Shared helpers for reflection-* hook scripts.
# Sourced by reflection-extract.sh / reflection-activity.sh / reflection-inject.sh.

# jq_field <hook_input_json> <field_name>
#   Extract a top-level string field from hook input JSON. Returns empty on
#   any failure (jq missing, parse error, field absent or "null").
jq_field() {
  local input="$1" field="$2"
  command -v jq >/dev/null 2>&1 || { printf ''; return 0; }
  local value
  value=$(printf '%s' "$input" | jq -r ".${field} // \"\"" 2>/dev/null) || value=""
  [[ "$value" == "null" ]] && value=""
  printf '%s' "$value"
}

# log_diag <script_name> <reason>
#   Emit a single stderr line containing timestamp (ISO8601 UTC) + script name +
#   failure reason. Used by all FR-V failure paths to satisfy NFR-006.
log_diag() {
  local script="$1" reason="$2"
  local ts
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  printf '%s %s %s\n' "$ts" "$script" "$reason" >&2
}

# resolve_knowledge_dir <hook_input_json>
#   Resolve the knowledge directory in this precedence:
#     1. REFLECT_KNOWLEDGE_DIR env (test override or operator opt-in)
#     2. transcript_path-adjacent directory: <transcript_dir>/knowledge
#     3. cwd-adjacent: <cwd>/.claude/knowledge
#   Never falls back to a hardcoded HOME path to satisfy NFR-007.
resolve_knowledge_dir() {
  local input="${1:-}"
  if [[ -n "${REFLECT_KNOWLEDGE_DIR:-}" ]]; then
    printf '%s' "$REFLECT_KNOWLEDGE_DIR"
    return 0
  fi
  local transcript_path
  transcript_path=$(jq_field "$input" "transcript_path")
  if [[ -n "$transcript_path" ]]; then
    printf '%s/knowledge' "${transcript_path%/*}"
    return 0
  fi
  local cwd
  cwd=$(jq_field "$input" "cwd")
  printf '%s/.claude/knowledge' "${cwd:-.}"
}

# write_placeholder_md <md_path> <session_id>
#   Write a frontmatter-only reflection file for the empty-extraction path
#   (FR-003). Body is intentionally empty.
write_placeholder_md() {
  # NOTE: avoid local var name `path` — zsh links `path` array to `$PATH` string,
  # so a function-scoped `local path=...` collapses PATH inside the function and
  # any subsequent `date` / `cat` invocation fails with "command not found".
  # Same hazard applies to: cdpath, fpath, manpath, mailpath.
  local md_path="$1" sid="$2"
  local ts
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  cat > "$md_path" <<EOF
---
session_id: $sid
confidence: tentative
categories: []
word_count: 0
created_at: $ts
placeholder: true
---
EOF
}

# append_index_entry <index_path> <session_id> <md_path>
#   Append a JSONL entry for SessionStart injection. append-only by contract.
append_index_entry() {
  local index="$1" sid="$2" md="$3"
  local ts
  ts=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
  if command -v jq >/dev/null 2>&1; then
    jq -nc \
      --arg sid "$sid" \
      --arg md "$md" \
      --arg ts "$ts" \
      '{session_id:$sid,reflection_file:$md,created_at:$ts}' \
      >> "$index"
  else
    printf '{"session_id":"%s","reflection_file":"%s","created_at":"%s"}\n' \
      "$sid" "$md" "$ts" >> "$index"
  fi
}
