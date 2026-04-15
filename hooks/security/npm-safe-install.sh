#!/bin/zsh
# PreToolUse hook: Block package install when ignore-scripts is not configured
# Failure mode: fail-closed (security enforcement)

set -euo pipefail

INPUT=$(cat)
command -v jq >/dev/null 2>&1 || exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')
FIRST="${COMMAND%% *}"
REST="${COMMAND#* }"
SUBCMD="${REST%% *}"

MATCH=0
case "$FIRST" in
  npm|pnpm|yarn|bun)
    case "$SUBCMD" in
      install|i|ci|add|update|up|upgrade) MATCH=1 ;;
    esac
    ;;
  ni|nci|nup) MATCH=1 ;;
esac

[[ $MATCH -eq 1 ]] || exit 0

NPMRC="$HOME/.npmrc"
if [[ -f "$NPMRC" ]] && grep -q '^ignore-scripts=true' "$NPMRC" 2>/dev/null; then
  exit 0
fi

REASON="~/.npmrc に ignore-scripts=true が未設定です。サプライチェーン攻撃対策として必須です。echo 'ignore-scripts=true' >> ~/.npmrc を実行後に再試行してください。"
jq -n --arg reason "$REASON" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "block",
    permissionDecisionReason: $reason
  }
}'
