#!/bin/zsh
# CCPlanView opener: opens SOW/Spec/IDR files in CCPlanView
# Failure mode: fail-open (skip if app not installed)
set +e

CCPLANVIEW_APP="/Applications/CCPlanView.app"

[[ -d "$CCPLANVIEW_APP" ]] || exit 0
command -v jq &>/dev/null || exit 0

INPUT="$(cat)"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"

case "$FILE_PATH" in
  */sow.md|*/sow-*.md|*_sow.md) ;;
  */spec.md|*/spec-*.md|*_spec.md) ;;
  */idr-*.md) ;;
  *) exit 0 ;;
esac

[[ -f "$FILE_PATH" ]] || exit 0

open -a "CCPlanView" "$FILE_PATH" &>/dev/null &
disown
