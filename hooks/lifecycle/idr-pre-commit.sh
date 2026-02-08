#!/bin/bash
# IDR Pre-commit Hook — blocks git commit until IDR is generated
# Failure mode: fail-closed (block on error)
# PreToolUse hook for Bash tool; triggers only on git commit commands
#
# Protocol:
#   exit 0 = allow (recent IDR exists, or not a git commit)
#   exit 2 = block (no recent IDR; outputs staged diff for Claude to generate IDR)

set -euo pipefail

# Fast-path: skip jq parsing for non-commit commands (99%+ of invocations)
INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && exit 0
[[ "$INPUT" == *"git commit"* ]] || exit 0

# Fail-closed input validation
command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }
COMMAND=$(jq -r '.tool_input.command // ""' <<< "$INPUT") || { echo "BLOCKED: invalid JSON" >&2; exit 2; }
[[ -z "$COMMAND" ]] && exit 0
[[ "$COMMAND" =~ git[[:space:]]+commit ]] || exit 0

# IDR output directory: SOW parent dir if active, otherwise planning/<date>/
IDR_FRESHNESS_MINUTES=${IDR_FRESHNESS_MINUTES:-5}
IDR_DIR="$HOME/.claude/workspace/planning/${TODAY:-$(date +%Y-%m-%d)}"
CURRENT_SOW="$HOME/.claude/workspace/.current-sow"

# Path traversal validation (portable: python3 fallback for macOS)
resolve_path() {
  realpath -m "$1" 2>/dev/null || python3 -c "import os; print(os.path.realpath('$1'))" 2>/dev/null || echo "$1"
}

if [ -f "$CURRENT_SOW" ]; then
  SOW_PATH=$(cat "$CURRENT_SOW")
  real_sow=$(resolve_path "$SOW_PATH")
  real_workspace=$(resolve_path "$HOME/.claude/workspace")
  if [[ "$real_sow" == "$real_workspace"/* ]] && [ -f "$SOW_PATH" ]; then
    IDR_DIR=$(dirname "$SOW_PATH")
  fi
fi

if [[ ! -d "$IDR_DIR" ]]; then
  RECENT_IDR=""
else
  RECENT_IDR=$(find "$IDR_DIR" -maxdepth 1 \( -name 'idr.md' -o -name 'idr-*.md' \) -mmin -${IDR_FRESHNESS_MINUTES} 2>/dev/null | head -1) || true
fi
if [ -n "$RECENT_IDR" ]; then
  exit 0
fi

# Output staged diff for Claude's context (truncated to avoid context exhaustion)
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
echo "リポジトリ: ${REPO_ROOT}"
echo "IDR出力先: ${IDR_DIR}/"
echo ""
echo "上記の staged diff とセッションの議論経緯を踏まえて、IDR を生成してからコミットしてください。"
echo "ファイルリンクは絶対パス（${REPO_ROOT}/...）で記載してください。"

echo "BLOCKED: IDR not generated yet" >&2
exit 2
