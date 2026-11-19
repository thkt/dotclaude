#!/bin/zsh
set +e

[[ -n "${CLAUDE_CODE_IS_SUBAGENT:-}" ]] && exit 0

if [[ "${1:-}" == "stop" ]]; then
  input=$(cat)
  case "$input" in
    *stop_reason*) ;;
    *) exit 0 ;;
  esac
  command -v jq &>/dev/null || exit 0
  reason="$(printf '%s' "$input" | jq -r '.stop_reason // "end_turn"' 2>/dev/null)"
  [[ "${reason:-end_turn}" == "end_turn" ]] && exit 0
fi

SOUND="$(cd "$(dirname "$0")" && pwd)/../../sounds/DHVMagellanHorn_Heavy.mp3"
[[ -f "$SOUND" ]] && afplay -volume 0.1 "$SOUND" &

exit 0
