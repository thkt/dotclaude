#!/bin/zsh
set +e

# Failure mode: fail-open (partial display is acceptable)

sep() { printf ' \033[90m│\033[0m '; }
color_for_pct() {
    if [ "$1" -lt 50 ]; then printf '\033[32m'
    elif [ "$1" -lt 80 ]; then printf '\033[33m'
    else printf '\033[31m'; fi
}

DEFAULT_CONTEXT_LIMIT=${DEFAULT_CONTEXT_LIMIT:-200000}

parse_stdin() {
    EXCEEDS_200K="false"
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
        (.transcript_path // ""),
        (.cost.total_cost_usd? // ""),
        (.exceeds_200k_tokens // false),
        (if .context_window.current_usage? then
          (.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.output_tokens // 0) +
          (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0)
        else
          .context.tokens_used? // .context_tokens? // .tokens.context? // .usage.total_tokens? // ""
        end),
        (.context_window.context_window_size? // .context.limit? // .context_limit? // .tokens.limit? // ""),
        (.context_window.used_percentage? // ""),
        (.context_window.remaining_percentage? // ""),
        (.worktree.name? // ""),
        (.worktree.path? // ""),
        (.worktree.branch? // ""),
        (.worktree.directory? // "")
      ] | map(tostring) | @tsv' 2>/dev/null)

    if [ -n "$parsed" ]; then
        IFS=$'\t' read -r MODEL_NAME MODEL_ID SESSION_ID TRANSCRIPT_PATH SESSION_COST \
            EXCEEDS_200K CONTEXT_TOKENS CONTEXT_LIMIT CONTEXT_USED_PCT CONTEXT_REMAINING_PCT \
            WT_NAME WT_PATH WT_BRANCH WT_ORIG_DIR <<< "$parsed"
    fi

    if { [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ] || [ "$CONTEXT_TOKENS" = "" ]; } && \
       [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        CONTEXT_TOKENS=$(tail -n 100 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s '[.[] | select(.type == "assistant" and .message.usage)] |
                if length > 0 then .[-1].message.usage |
                (.input_tokens // 0) + (.output_tokens // 0) +
                (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)
                else 0 end' 2>/dev/null)
    fi
}

load_state() {
    local state_dir="$HOME/.claude/cache"
    mkdir -p "$state_dir"
    STATE_FILE="${state_dir}/context-${SESSION_ID:-$$}.state"
    PREV_TOKENS=0
    CONTEXT_DELTA=0
    LAST_TOOL=""
    TOOL_COUNT=0

    if [ -f "$STATE_FILE" ]; then
        IFS=$'\t' read -r PREV_TOKENS CACHED_TOOL CACHED_COUNT < "$STATE_FILE" 2>/dev/null
        [ -z "$PREV_TOKENS" ] && PREV_TOKENS=0
        [[ "$PREV_TOKENS" =~ ^[0-9]+$ ]] || PREV_TOKENS=0
        [ -z "$CACHED_COUNT" ] && CACHED_COUNT=0
    fi

    if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
        CONTEXT_DELTA=$((CONTEXT_TOKENS - PREV_TOKENS))
    fi

    if [ "$CONTEXT_DELTA" -ne 0 ] 2>/dev/null && [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        local tool_parsed
        tool_parsed=$(tail -n 500 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -rs '[.[] | select(.type == "tool_use")] |
                [(if length > 0 then .[-1].name else "" end), length] | @tsv' 2>/dev/null)
        if [ -n "$tool_parsed" ]; then
            IFS=$'\t' read -r LAST_TOOL TOOL_COUNT <<< "$tool_parsed"
            [ "$LAST_TOOL" = "null" ] && LAST_TOOL=""
        fi
        [ -z "$TOOL_COUNT" ] && TOOL_COUNT=0
    else
        LAST_TOOL="${CACHED_TOOL:-}"
        TOOL_COUNT="${CACHED_COUNT:-0}"
    fi

    if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
        printf '%s\t%s\t%s\n' "$CONTEXT_TOKENS" "$LAST_TOOL" "$TOOL_COUNT" > "$STATE_FILE"
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
    [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ] && CONTEXT_TOKENS=0
    [[ "$CONTEXT_TOKENS" =~ ^[0-9]+$ ]] || CONTEXT_TOKENS=0

    local limit_guessed=false
    if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ] || [ "$CONTEXT_LIMIT" = "0" ]; then
        CONTEXT_LIMIT=$DEFAULT_CONTEXT_LIMIT; limit_guessed=true
    fi
    [[ "$CONTEXT_LIMIT" =~ ^[0-9]+$ ]] || { CONTEXT_LIMIT=$DEFAULT_CONTEXT_LIMIT; limit_guessed=true; }
    [ "$CONTEXT_LIMIT" -gt 0 ] 2>/dev/null || return

    local percentage remaining
    if [ -n "$CONTEXT_USED_PCT" ] && [ "$CONTEXT_USED_PCT" != "null" ] && [[ "$CONTEXT_USED_PCT" =~ ^[0-9.]+$ ]]; then
        percentage=$(printf "%.0f" "$CONTEXT_USED_PCT" 2>/dev/null || echo "$CONTEXT_USED_PCT" | cut -d. -f1)
        remaining=$(printf "%.0f" "$CONTEXT_REMAINING_PCT" 2>/dev/null || echo "$CONTEXT_REMAINING_PCT" | cut -d. -f1)
    else
        percentage=$((CONTEXT_TOKENS * 100 / CONTEXT_LIMIT))
        remaining=$((100 - percentage))
    fi

    # Bridge file for context-monitor.sh PostToolUse hook
    # Contract: $TMPDIR/claude-ctx-{session_id}.json → {session_id, remaining_pct, used_pct, ts}
    if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ] && [[ "$SESSION_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        printf '{"session_id":"%s","remaining_pct":%d,"used_pct":%d,"ts":%d}\n' \
            "$SESSION_ID" "$remaining" "$percentage" "${EPOCHSECONDS:-$(date +%s)}" \
            > "${TMPDIR:-/tmp}/claude-ctx-${SESSION_ID}.json" 2>/dev/null
    fi

    local tokens_k=$((CONTEXT_TOKENS / 1000)) limit_k=$((CONTEXT_LIMIT / 1000))
    local circle color

    if [ "$remaining" -ge 45 ]; then circle="◔"
    elif [ "$remaining" -ge 20 ]; then circle="◑"
    else circle="◕"; fi

    if [ "$EXCEEDS_200K" = "true" ]; then color='\033[31;1m'
    elif [ "$percentage" -lt 60 ]; then color='\033[32m'
    elif [ "$percentage" -lt 80 ]; then color='\033[33m'
    else color='\033[31m'; fi

    [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ] && sep
    printf "${color}%s %dk/%dk (%d%%)\033[0m" "$circle" "$tokens_k" "$limit_k" "$percentage"
    [ "$limit_guessed" = "true" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null && printf '\033[90m?\033[0m'

    if [ "$CONTEXT_DELTA" -ne 0 ] 2>/dev/null; then
        local delta_k=$((CONTEXT_DELTA / 1000))
        if [ "$delta_k" -ne 0 ] 2>/dev/null; then
            if [ "$CONTEXT_DELTA" -gt 0 ]; then printf ' \033[94m+%dk\033[0m' "$delta_k"
            else printf ' \033[35m-%dk\033[0m' "$((-delta_k))"; fi
        fi
    fi

    [ "$EXCEEDS_200K" = "true" ] && printf ' \033[31;1m[!]\033[0m'
}

render_cost() {
    [ -n "$SESSION_COST" ] && [ "$SESSION_COST" != "null" ] && [ "$SESSION_COST" != "0" ] || return
    sep
    printf '\033[33m$%s\033[0m' "$(printf "%.2f" "$SESSION_COST" 2>/dev/null || echo "$SESSION_COST")"
}

fetch_usage() {
    local cache_file="$HOME/.claude/cache/usage-api.cache"
    local cache_ttl=120
    local now=$(date +%s)
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

render_tools() {
    [ -n "$LAST_TOOL" ] && [ "$LAST_TOOL" != "null" ] || return
    local tool_short="$LAST_TOOL"
    case "$LAST_TOOL" in
        Read) tool_short="R" ;; Write) tool_short="W" ;; Edit) tool_short="E" ;;
        Bash) tool_short="B" ;; Glob) tool_short="G" ;; Grep) tool_short="g" ;;
        Task) tool_short="T" ;; WebFetch) tool_short="WF" ;; WebSearch) tool_short="WS" ;;
        TaskCreate) tool_short="T+" ;; TaskUpdate) tool_short="T~" ;;
        TaskList) tool_short="TL" ;; TaskGet) tool_short="TG" ;;
        TaskOutput) tool_short="TO" ;; TaskStop) tool_short="TS" ;;
        SendMessage) tool_short="DM" ;; LSP) tool_short="LSP" ;;
        AskUserQuestion) tool_short="?" ;;
    esac
    sep
    printf '\033[36m%s\033[0m' "$tool_short"
    [ "$TOOL_COUNT" -gt 0 ] 2>/dev/null && printf '\033[90m(%d)\033[0m' "$TOOL_COUNT"
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

has_no_cost() {
    [ -z "$SESSION_COST" ] || [ "$SESSION_COST" = "null" ] || [ "$SESSION_COST" = "0" ]
}

parse_stdin
fetch_usage
render_model
if has_no_cost; then
    sep
    printf '\033[32m◔ ready\033[0m'
else
    load_state
    render_context
    render_cost
    render_tools
fi
render_usage
render_git
