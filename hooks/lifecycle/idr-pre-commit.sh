#!/bin/zsh
set -euo pipefail

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && exit 0
[[ "$INPUT" == *"git commit"* ]] || exit 0

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }
COMMAND=$(jq -r '.tool_input.command // ""' <<< "$INPUT") || { echo "BLOCKED: invalid JSON" >&2; exit 2; }
[[ -z "$COMMAND" ]] && exit 0
[[ "$COMMAND" =~ ^git[[:space:]]+commit ]] || exit 0

IDR_FRESHNESS_MINUTES=${IDR_FRESHNESS_MINUTES:-5}
[[ "$IDR_FRESHNESS_MINUTES" =~ ^[0-9]+$ ]] || IDR_FRESHNESS_MINUTES=5
TODAY="${TODAY:-$(date +%Y-%m-%d)}"
[[ "$TODAY" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || TODAY=$(date +%Y-%m-%d)
IDR_DIR="$HOME/.claude/workspace/planning/${TODAY}"
CURRENT_SOW="$HOME/.claude/workspace/.current-sow"

resolve_path() {
  realpath "$1" 2>/dev/null || \
  python3 -c "import os,sys; print(os.path.realpath(sys.argv[1]))" "$1" 2>/dev/null || \
  { echo "ERROR: Cannot resolve path: $1" >&2; return 1; }
}

if [ -f "$CURRENT_SOW" ]; then
  SOW_PATH=$(cat "$CURRENT_SOW")
  if [ -f "$SOW_PATH" ]; then
    real_sow=$(resolve_path "$SOW_PATH")
    real_workspace=$(resolve_path "$HOME/.claude/workspace")
    if [[ "$real_sow" == "$real_workspace"/* ]]; then
      IDR_DIR=$(dirname "$SOW_PATH")
    fi
  else
    echo "WARNING: .current-sow points to missing file: $SOW_PATH" >&2
  fi
fi

if [[ ! -d "$IDR_DIR" ]]; then
  RECENT_IDR=""
else
  RECENT_IDR=$(find "$IDR_DIR" -maxdepth 1 -name 'idr-*.md' -mmin "-${IDR_FRESHNESS_MINUTES}" 2>/dev/null | head -1) || true
fi
if [ -n "$RECENT_IDR" ]; then
  exit 0
fi

if [[ -d "$IDR_DIR" ]]; then
  LAST_NUM=$(find "$IDR_DIR" -maxdepth 1 -name 'idr-*.md' 2>/dev/null | sed -n 's/.*idr-\([0-9][0-9]*\)\.md$/\1/p' | sort -n | tail -1) || true
  NEXT_NUM=$(printf "%02d" $(( ${LAST_NUM:-0} + 1 )))
else
  NEXT_NUM="01"
fi

echo "## Staged Changes"
echo ""
echo '```'
git diff --cached --stat 2>/dev/null | head -50 || true
echo '```'
echo ""
echo '```diff'
git diff --cached --no-binary 2>/dev/null | head -500 || true
echo '```'
echo ""
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")
echo "Repository: ${REPO_ROOT}"
echo "IDR output: ${IDR_DIR}/idr-${NEXT_NUM}.md"
echo ""
echo "Generate an IDR based on the staged diff above and session context, then retry the commit."
echo "Format: follow the IDR Generation section in skills/orchestrating-workflows/references/code-workflow.md"
echo "File links: use file:///${REPO_ROOT}/... format."

echo "BLOCKED: IDR not generated yet" >&2
exit 2
