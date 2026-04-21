#!/bin/zsh
# tool-routing.sh - Route WebFetch/WebSearch to the appropriate CLI based on URL pattern.
# Block the builtin tool and suggest a specific CLI command (xr / scout).

set -euo pipefail

input=$(cat)
tool_name=$(printf '%s' "$input" | jq -r '.tool_name // ""')

emit_deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
}

if [ "$tool_name" = "WebSearch" ]; then
  emit_deny 'WebSearch is disabled. Use `scout search "<query>"` or `scout research "<query>"` via Bash.'
  exit 0
fi

if [ "$tool_name" = "WebFetch" ]; then
  url=$(printf '%s' "$input" | jq -r '.tool_input.url // ""')

  case "$url" in
    *x.com/*/status/*|*twitter.com/*/status/*)
      emit_deny "WebFetch is disabled. Use \`xr tweet $url\` via Bash (add --thread for replies)."
      exit 0
      ;;
    *x.com/*/article/*|*twitter.com/*/article/*)
      emit_deny "WebFetch is disabled. Use \`xr article $url\` via Bash."
      exit 0
      ;;
    *.slack.com/archives/*|*slack.com/archives/*)
      emit_deny "WebFetch is disabled. Use \`scout fetch $url\` via Bash (bot token handled)."
      exit 0
      ;;
  esac

  # x.com / twitter.com profile (/<screen_name>/?)
  if [[ "$url" =~ ^https?://(www\.)?(x\.com|twitter\.com)/([A-Za-z0-9_]+)/?$ ]]; then
    screen_name=$match[3]
    emit_deny "WebFetch is disabled. Use \`xr user $screen_name\` via Bash."
    exit 0
  fi

  # github.com/<owner>/<repo> overview
  if [[ "$url" =~ ^https?://github\.com/([^/]+/[^/]+)/?$ ]]; then
    repo=$match[1]
    emit_deny "WebFetch is disabled. Use \`scout repo-overview $repo\` via Bash."
    exit 0
  fi

  # Fallback
  emit_deny "WebFetch is disabled. Use \`scout fetch $url\` (or \`scout research \"<query>\"\` for library docs) via Bash."
  exit 0
fi

# Other matchers: pass through
exit 0
