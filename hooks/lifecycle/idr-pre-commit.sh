#!/bin/zsh
set -euo pipefail

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && exit 0
[[ "$INPUT" == *"git commit"* ]] || exit 0

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""') || { echo "BLOCKED: invalid JSON" >&2; exit 2; }
[[ -z "$COMMAND" ]] && exit 0
[[ "$COMMAND" =~ ^git[[:space:]]+commit ]] || exit 0

IDR_FRESHNESS_MINUTES=${IDR_FRESHNESS_MINUTES:-5}
[[ "$IDR_FRESHNESS_MINUTES" =~ ^[0-9]+$ ]] || IDR_FRESHNESS_MINUTES=5
TODAY="${TODAY:-$(date +%Y-%m-%d)}"
[[ "$TODAY" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || TODAY=$(date +%Y-%m-%d)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || printf '%s' "$PWD")
if [[ "${REPO_ROOT:t}" == ".claude" ]]; then
  WORKSPACE_BASE="${REPO_ROOT}/workspace"
else
  WORKSPACE_BASE="${REPO_ROOT}/.claude/workspace"
fi
IDR_DIR="${WORKSPACE_BASE}/planning/${TODAY}"
CURRENT_SOW="${WORKSPACE_BASE}/.current-sow"

if [[ -f "$CURRENT_SOW" ]]; then
  SOW_PATH=$(<"$CURRENT_SOW")
  if [[ ! -f "$SOW_PATH" ]]; then
    echo "WARNING: .current-sow points to missing file: $SOW_PATH" >&2
  elif [[ "${SOW_PATH:A}" == "${WORKSPACE_BASE:A}"/* ]]; then
    IDR_DIR=$(dirname "$SOW_PATH")
  else
    echo "WARNING: .current-sow path outside workspace: $SOW_PATH" >&2
  fi
fi

# -print -quit avoids SIGPIPE from | head -1; separate find avoids || true swallowing errors
if [[ -d "$IDR_DIR" ]]; then
  RECENT_IDR=$(find "$IDR_DIR" -maxdepth 1 -name 'idr-*.md' -mmin "-${IDR_FRESHNESS_MINUTES}" -print -quit 2>/dev/null) || true
  [[ -n "$RECENT_IDR" ]] && exit 0
  IDR_FILES=$(find "$IDR_DIR" -maxdepth 1 -name 'idr-*.md' 2>/dev/null) || true
  LAST_NUM=$(printf '%s' "$IDR_FILES" | sed -n 's/.*idr-\([0-9][0-9]*\)\.md$/\1/p' | sort -n | tail -1)
  NEXT_NUM=$(printf "%02d" $(( ${LAST_NUM:-0} + 1 )))
else
  NEXT_NUM="01"
fi

TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // ""')
INTENT=""
# Redirect jq stderr to distinguish parse errors from empty results
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  JQ_ERR=$(mktemp)
  trap 'rm -f "$JQ_ERR"' EXIT
  INTENT=$(jq -r '
    select(
      .type == "user" and .userType == "external"
      and (.message.content | type) == "string"
      and (.message.content | length) > 0
      and (.message.content | test("^\\s*[⏺⎿<\\[]") | not)
    )
    | .message.content
  ' "$TRANSCRIPT" 2>"$JQ_ERR" \
    | head -5) || true
  if [[ -s "$JQ_ERR" ]]; then
    echo "WARNING: transcript parse failed: $(head -1 "$JQ_ERR")" >&2
  elif [[ -z "$INTENT" ]] && [[ -s "$TRANSCRIPT" ]]; then
    echo "WARNING: transcript non-empty but no user messages extracted" >&2
  fi
fi

DIFF_STAT=$(git diff --cached --stat 2>/dev/null | head -50) || true
DIFF_CONTENT=$(git diff --cached --no-binary 2>/dev/null | head -500) || true

CONTEXT=$(cat <<EOF
## User Intent (from session log)

${INTENT:-(No user messages found in transcript)}

## Staged Changes

\`\`\`
${DIFF_STAT}
\`\`\`

\`\`\`diff
${DIFF_CONTENT}
\`\`\`

Repository: ${REPO_ROOT}
IDR output: ${IDR_DIR}/idr-${NEXT_NUM}.md

Generate an IDR based on the staged diff and user intent above, then retry the commit.
Format: follow the IDR Generation section in skills/orchestrating-workflows/references/code-workflow.md
File links: use file:///${REPO_ROOT}/... format.
EOF
)

printf '%s' "$CONTEXT" | jq -Rs '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "IDR not generated yet",
    additionalContext: .
  }
}'
exit 0
