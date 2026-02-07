#!/bin/bash
# CCPlanView opener: opens SOW/Spec/IDR files in CCPlanView
# Failure mode: fail-open (skip if app not installed)
set -euo pipefail

CCPLANVIEW_APP="/Applications/CCPlanView.app"

[[ -d "$CCPLANVIEW_APP" ]] || exit 0
command -v jq &>/dev/null || exit 0

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

case "$file_path" in
  */sow.md|*/sow-*.md|*_sow.md) ;;
  */spec.md|*/spec-*.md|*_spec.md) ;;
  */idr-*.md) ;;
  *) exit 0 ;;
esac

[[ -f "$file_path" ]] || exit 0

open -a "CCPlanView" "$file_path" &>/dev/null &
disown
