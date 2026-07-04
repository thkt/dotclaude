#!/usr/bin/env bash
# PostToolUse recorder wrapper. Wired three times from settings.json with a kind arg:
#   record.sh subagent  (matcher Agent)
#   record.sh bash      (matcher Bash)
#   record.sh skip      (matcher AskUserQuestion)
# Best-effort: no node means no record. The gate, not the recorder, fails closed.
input="$(cat)"
command -v node >/dev/null 2>&1 || exit 0
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
printf '%s' "$input" | node "$DIR/record.mjs" "${1:-}" >/dev/null 2>&1 || true
exit 0
