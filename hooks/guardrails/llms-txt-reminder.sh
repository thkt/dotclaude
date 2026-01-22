#!/bin/bash
set -euo pipefail

command -v jq &>/dev/null || { echo '{}'; exit 0; }

INPUT=$(cat)
URL=$(echo "$INPUT" | jq -r '.tool_input.url // empty')
[ -z "$URL" ] && { echo '{}'; exit 0; }

if echo "$URL" | grep -qiE '(docs\.|/docs/|documentation|api-reference|reference|guide)'; then
    BASE_URL=$(echo "$URL" | sed -E 's|(https?://[^/]+).*|\1|')
    MSG="llms.txt Check: Documentation URL detected. Consider fetching ${BASE_URL}/llms.txt first for LLM-optimized content. If 404, proceed with original URL."
    jq -n --arg msg "$MSG" '{"additional_context": $msg}'
else
    echo '{}'
fi
