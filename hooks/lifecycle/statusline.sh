#!/bin/zsh
set +e

# Failure mode: fail-open (partial display is acceptable)

sep() { printf ' \033[90m│\033[0m '; }
color_for_pct() {
    if [ "$1" -lt 50 ]; then printf '\033[32m'
    elif [ "$1" -lt 80 ]; then printf '\033[33m'
    else printf '\033[31m'; fi
}

parse_stdin() {
    local stdin_input
    [ ! -t 0 ] && stdin_input=$(cat)
    [ -z "${stdin_input:-}" ] && return
    command -v jq &>/dev/null || return

    local parsed
    parsed=$(printf '%s' "$stdin_input" | jq -r '
      [
        (.model.display_name? // ""),
        (.model.id? // ""),
        (.session_id // ""),
        (.cost.total_cost_usd? // ""),
        (if .context_window.current_usage? then
          (.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.output_tokens // 0) +
          (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0)
        else "" end),
        (.context_window.context_window_size? // ""),
        (.context_window.used_percentage? // ""),
        (.worktree.name? // ""),
        (.worktree.branch? // ""),
        (.worktree.directory? // "")
      ] | map(tostring) | @tsv' 2>/dev/null)

    if [ -n "$parsed" ]; then
        IFS=$'\t' read -r MODEL_NAME MODEL_ID SESSION_ID SESSION_COST \
            CONTEXT_TOKENS CONTEXT_LIMIT CONTEXT_USED_PCT \
            WT_NAME WT_BRANCH WT_ORIG_DIR <<< "$parsed"
    fi

    [[ "${SESSION_ID:-}" =~ ^[a-zA-Z0-9_-]+$ ]] || SESSION_ID=""
}

load_state() {
    local state_file="$HOME/.claude/cache/context-${SESSION_ID:-$$}.state"
    PREV_TOKENS=0
    CONTEXT_DELTA=0

    if [ -f "$state_file" ]; then
        read -r PREV_TOKENS < "$state_file" 2>/dev/null
        [[ "$PREV_TOKENS" =~ ^[0-9]+$ ]] || PREV_TOKENS=0
    fi

    if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
        CONTEXT_DELTA=$((CONTEXT_TOKENS - PREV_TOKENS))
        printf '%s\n' "$CONTEXT_TOKENS" > "$state_file" 2>/dev/null
    fi
}

render_model() {
    if [ -n "$MODEL_NAME" ]; then
        printf '\033[94m%s\033[0m' "$MODEL_NAME"
    elif [ -n "$MODEL_ID" ]; then
        printf '\033[94m%s\033[0m' "$(echo "$MODEL_ID" | sed -E 's/^(claude-)?//; s/-[0-9]{8}$//')"
    fi
}

render_context() {
    [[ "$CONTEXT_TOKENS" =~ ^[0-9]+$ ]] || CONTEXT_TOKENS=0
    [[ "$CONTEXT_LIMIT" =~ ^[1-9][0-9]*$ ]] || return
    [[ "$CONTEXT_USED_PCT" =~ ^[0-9.]+$ ]] || return

    local percentage remaining
    percentage=$(printf "%.0f" "$CONTEXT_USED_PCT")
    remaining=$((100 - percentage))

    # Bridge file for context-monitor.sh PostToolUse hook
    # Contract: $TMPDIR/claude-ctx-{session_id}.json → {session_id, remaining_pct, used_pct, ts}
    if [ -n "$SESSION_ID" ]; then
        printf '{"session_id":"%s","remaining_pct":%d,"used_pct":%d,"ts":%d}\n' \
            "$SESSION_ID" "$remaining" "$percentage" "${EPOCHSECONDS:-$(date +%s)}" \
            > "${TMPDIR:-/tmp}/claude-ctx-${SESSION_ID}.json" 2>/dev/null
    fi

    local tokens_k=$((CONTEXT_TOKENS / 1000)) limit_k=$((CONTEXT_LIMIT / 1000))
    local circle color

    if [ "$remaining" -ge 45 ]; then circle="◔"
    elif [ "$remaining" -ge 20 ]; then circle="◑"
    else circle="◕"; fi

    if [ "$percentage" -lt 60 ]; then color='\033[32m'
    elif [ "$percentage" -lt 80 ]; then color='\033[33m'
    else color='\033[31m'; fi

    [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ] && sep
    printf "${color}%s %dk/%dk (%d%%)\033[0m" "$circle" "$tokens_k" "$limit_k" "$percentage"
    local delta_k=$((CONTEXT_DELTA / 1000))
    if [ "$delta_k" -gt 0 ] 2>/dev/null; then printf ' \033[94m+%dk\033[0m' "$delta_k"
    elif [ "$delta_k" -lt 0 ] 2>/dev/null; then printf ' \033[35m-%dk\033[0m' "$((-delta_k))"; fi

    [ "$percentage" -ge 80 ] && printf ' \033[31;1m[!]\033[0m'
}

render_cost() {
    [ -n "$SESSION_COST" ] && [ "$SESSION_COST" != "null" ] && [ "$SESSION_COST" != "0" ] || return
    sep
    printf '\033[33m$%s\033[0m' "$(printf "%.2f" "$SESSION_COST" 2>/dev/null || echo "$SESSION_COST")"
}

fetch_usage() {
    local cache_file="$HOME/.claude/cache/usage-api.cache"
    local cache_ttl=120
    local now=${EPOCHSECONDS:-$(date +%s)}
    local cache_mtime=0
    USAGE_5H="" USAGE_7D=""

    if [ -f "$cache_file" ]; then
        cache_mtime=$(stat -f %m "$cache_file" 2>/dev/null || printf '0')
        IFS=$'\t' read -r USAGE_5H USAGE_7D < "$cache_file" 2>/dev/null
    fi

    if [ $((now - cache_mtime)) -ge $cache_ttl ]; then
        {
            local creds token response usage
            creds=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null) || return
            token=$(printf '%s' "$creds" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4) || return
            [ -n "$token" ] || return
            response=$(printf 'header "Authorization: Bearer %s"\n' "$token" | \
                curl -s --max-time 3 -K - \
                -H "anthropic-beta: oauth-2025-04-20" \
                -w '\n%{http_code}' \
                https://api.anthropic.com/api/oauth/usage)
            local http_code="${response##*$'\n'}"
            local body="${response%$'\n'*}"
            if [ "$http_code" = "200" ]; then
                usage=$(printf '%s' "$body" | jq -r '[.five_hour.utilization, .seven_day.utilization] | map(. // empty) | @tsv')
                if [ -n "$usage" ]; then
                    local tmp_cache="${cache_file}.tmp.$$"
                    printf '%s\n' "$usage" > "$tmp_cache" && mv "$tmp_cache" "$cache_file"
                fi
            fi
        } &!
    fi
}

render_usage() {
    if [ -z "$USAGE_5H" ] || [ "$USAGE_5H" = "ERR" ] || ! [[ "${USAGE_5H%.*}" =~ ^[0-9]+$ ]]; then
        sep; printf '\033[90m5h:- 7d:-\033[0m'; return
    fi
    local p5=${USAGE_5H%.*} p7=${USAGE_7D%.*}
    [[ "$p7" =~ ^[0-9]+$ ]] || p7=0

    local c5=$(color_for_pct "$p5") c7=$(color_for_pct "$p7")

    sep
    printf "${c5}5h:%d%%\033[0m ${c7}7d:%d%%\033[0m" "$p5" "$p7"
}

render_git() {
    sep

    # Worktree session: use pre-parsed JSON fields (no git subprocess)
    if [ -n "$WT_NAME" ] && [ "$WT_NAME" != "null" ]; then
        printf '\033[96;1m%s\033[0m' "$WT_NAME"
        [ -n "$WT_BRANCH" ] && [ "$WT_BRANCH" != "null" ] && \
            printf ' on \033[95m%s\033[0m' "$WT_BRANCH"
        printf ' \033[92m[wt]\033[0m'
        [ -n "$WT_ORIG_DIR" ] && [ "$WT_ORIG_DIR" != "null" ] && \
            printf ' \033[90m← %s\033[0m' "$(basename "$WT_ORIG_DIR")"
        source "$(dirname "$0")/_pr-cache.sh" || true
        return
    fi

    printf '\033[96;1m%s\033[0m' "$(basename "$PWD")"

    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
    [ -z "$BRANCH" ] && return

    printf ' on \033[95m%s\033[0m' "$BRANCH"

    local git_dir git_common
    { read -r git_dir; read -r git_common; } <<< "$(git rev-parse --git-dir --git-common-dir 2>/dev/null)"
    [ -n "$git_common" ] && [ "$git_common" != "$git_dir" ] && printf ' \033[92m[wt]\033[0m'

    source "$(dirname "$0")/_pr-cache.sh" || true
}

parse_stdin
fetch_usage
render_model
if [ -z "$SESSION_COST" ] || [ "$SESSION_COST" = "null" ] || [ "$SESSION_COST" = "0" ]; then
    sep
    printf '\033[32m◔ ready\033[0m'
else
    load_state
    render_context
    render_cost
fi
render_usage
render_git
