#!/bin/bash
set -euo pipefail

CCPLANVIEW_APP="/Applications/CCPlanView.app"

if [[ ! -d "$CCPLANVIEW_APP" ]]; then
  exit 0
fi

if ! command -v jq &>/dev/null; then
  exit 0
fi

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

case "$file_path" in
  */sow.md|*/sow-*.md|*_sow.md) ;;
  */spec.md|*/spec-*.md|*_spec.md) ;;
  */.idr-*.md) ;;
  *) exit 0 ;;
esac

[[ -f "$file_path" ]] || exit 0

open -a "CCPlanView" "$file_path" &>/dev/null &
disown
