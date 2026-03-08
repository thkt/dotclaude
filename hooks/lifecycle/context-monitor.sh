#!/bin/zsh
set +e

# Context Monitor - PostToolUse hook
# Reads bridge file from statusline, injects agent-facing warnings
# when context window usage exceeds thresholds.
#
# Bridge file: $TMPDIR/claude-ctx-{session_id}.json
# Written by: hooks/lifecycle/statusline.sh (render_context)
#
# Thresholds:
#   WARNING  (remaining <= 35%): Wrap up current work
#   CRITICAL (remaining <= 25%): Stop and inform user

WARNING_THRESHOLD=35
CRITICAL_THRESHOLD=25
STALE_SECONDS=60
DEBOUNCE_CALLS=5

input=""
if [ ! -t 0 ]; then
    IFS= read -r -t 3 -d '' input 2>/dev/null
fi
[ -z "$input" ] && exit 0

case "$input" in
    *'"session_id"'*) ;;
    *) exit 0 ;;
esac
session_id="${input#*\"session_id\":\"}"
session_id="${session_id%%\"*}"
[[ "$session_id" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 0

ctx_dir="${TMPDIR:-/tmp}"
bridge="${ctx_dir}/claude-ctx-${session_id}.json"
bridge_content=$(cat "$bridge" 2>/dev/null) || exit 0
[ -z "$bridge_content" ] && exit 0

remaining="${bridge_content#*\"remaining_pct\":}"
remaining="${remaining%%[,\}]*}"
[[ "$remaining" =~ ^[0-9]+$ ]] || exit 0

[ "$remaining" -gt "$WARNING_THRESHOLD" ] && exit 0

# --- Warning path (rare) — jq allowed below this line ---

command -v jq &>/dev/null || exit 0

bridge_data=$(printf '%s' "$bridge_content" | jq -r '[.remaining_pct, .used_pct, .ts] | @tsv' 2>/dev/null)
[ -z "$bridge_data" ] && exit 0

IFS=$'\t' read -r remaining used_pct ts <<< "$bridge_data"

now=${EPOCHSECONDS:-$(date +%s)}
[ $((now - ${ts:-0})) -gt $STALE_SECONDS ] && exit 0

# Debounce
warn_file="${ctx_dir}/claude-ctx-${session_id}-warned"
calls_since=0
last_level=""

if [ -f "$warn_file" ]; then
    IFS=$'\t' read -r calls_since last_level < "$warn_file" 2>/dev/null
    [[ "$calls_since" =~ ^[0-9]+$ ]] || calls_since=0
    calls_since=$((calls_since + 1))
fi

is_critical=0
[ "$remaining" -le "$CRITICAL_THRESHOLD" ] && is_critical=1

current_level="warning"
[ "$is_critical" -eq 1 ] && current_level="critical"

severity_escalated=0
[ "$current_level" = "critical" ] && [ "$last_level" = "warning" ] && severity_escalated=1

if [ "$calls_since" -gt 0 ] && [ "$calls_since" -lt "$DEBOUNCE_CALLS" ] && [ "$severity_escalated" -eq 0 ]; then
    printf '%s\t%s\n' "$calls_since" "$last_level" > "$warn_file"
    exit 0
fi

printf '0\t%s\n' "$current_level" > "$warn_file"

if [ "$is_critical" -eq 1 ]; then
    message="⚠️ CONTEXT CRITICAL: ${used_pct}% 使用済（残り ${remaining}%）。コンテキストがほぼ枯渇。新しい複雑な作業を開始しないでください。ユーザーにコンテキスト残量が少ないことを伝え、/compact の実行を提案してください。"
else
    message="⚠️ CONTEXT WARNING: ${used_pct}% 使用済（残り ${remaining}%）。コンテキストが限られています。不要な探索や新しい複雑な作業の開始を避けてください。"
fi

printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"%s"}}' \
    "$(printf '%s' "$message" | sed 's/"/\\"/g')"
