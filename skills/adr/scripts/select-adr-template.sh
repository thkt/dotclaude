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
# Includes Japanese keywords for bilingual titles.
case "$title_lower" in
  *deprecat*|*remov*|*retire*|*sunset*|*"phase out"*|*廃止*|*非推奨*|*削除*|*撤廃*)
    echo "deprecation"
    ;;
  *process*|*workflow*|*procedure*|*standard*|*policy*|*rule*|*プロセス*|*ワークフロー*|*規約*|*規則*|*手順*)
    echo "process-change"
    ;;
  *pattern*|*architecture*|*design*|*structure*|*template*|*パターン*|*アーキテクチャ*|*設計*|*構造*|*テンプレート*|*統一*)
    echo "architecture-pattern"
    ;;
  *)
    echo "technology-selection"
    ;;
esac
