#!/bin/zsh
# Purpose: Select template based on ADR title
# Input: $1 = ADR title
# Output: Template name
set -euo pipefail

title="${1:-}"

if [ -z "$title" ]; then
  echo "technology-selection"
  exit 0
fi

title_lower=$(echo "$title" | tr '[:upper:]' '[:lower:]')

# Priority: deprecation > process > architecture > technology (default)
case "$title_lower" in
  *deprecat*|*remov*|*retire*|*sunset*|*"phase out"*)
    echo "deprecation"
    ;;
  *process*|*workflow*|*procedure*|*standard*|*policy*|*rule*)
    echo "process-change"
    ;;
  *pattern*|*architecture*|*design*|*structure*)
    echo "architecture-pattern"
    ;;
  *)
    echo "technology-selection"
    ;;
esac
