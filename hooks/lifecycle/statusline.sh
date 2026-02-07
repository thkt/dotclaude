#!/bin/bash
set +e

# Claude Code status line: model, context, cost, tool, git branch
# Failure mode: fail-open (partial display is acceptable)

STDIN_INPUT=""
CONTEXT_TOKENS=""
CONTEXT_LIMIT=""
CONTEXT_USED_PCT=""
CONTEXT_REMAINING_PCT=""
MODEL_NAME=""
MODEL_ID=""
SESSION_ID=""
TRANSCRIPT_PATH=""
SESSION_COST=""
EXCEEDS_200K="false"
LAST_TOOL=""
TOOL_COUNT=0

if [ ! -t 0 ]; then
    STDIN_INPUT=$(cat)
fi

if [ -n "$STDIN_INPUT" ] && command -v jq &> /dev/null; then
    # Single jq call to extract all fields (was 12+ individual calls)
    PARSED=$(echo "$STDIN_INPUT" | jq -r '
      [
        (.model.display_name // ""),
        (.model.id // ""),
        (.session_id // ""),
        (.transcript_path // ""),
        (.cost.total_cost_usd // ""),
        (.exceeds_200k_tokens // false),
        # Context tokens: context_window.current_usage (v2.1+) > legacy fallbacks
        (if .context_window.current_usage != null then
          (.context_window.current_usage.input_tokens // 0) + (.context_window.current_usage.output_tokens // 0) +
          (.context_window.current_usage.cache_creation_input_tokens // 0) + (.context_window.current_usage.cache_read_input_tokens // 0)
        else
          .context.tokens_used // .context_tokens // .tokens.context // .usage.total_tokens // ""
        end),
        # Context limit: context_window.context_window_size (v2.1+) > legacy fallbacks
        (.context_window.context_window_size // .context.limit // .context_limit // .tokens.limit // ""),
        (.context_window.used_percentage // ""),
        (.context_window.remaining_percentage // "")
      ] | map(tostring) | @tsv' 2>/dev/null)

    if [ -n "$PARSED" ]; then
        IFS=$'\t' read -r MODEL_NAME MODEL_ID SESSION_ID TRANSCRIPT_PATH SESSION_COST \
            EXCEEDS_200K CONTEXT_TOKENS CONTEXT_LIMIT CONTEXT_USED_PCT CONTEXT_REMAINING_PCT <<< "$PARSED"
    fi

    # Fallback: read context tokens from transcript JSONL if stdin JSON had no usage data
    if { [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ] || [ "$CONTEXT_TOKENS" = "" ]; } && \
       [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        CONTEXT_TOKENS=$(tail -n 100 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s 'map(select(.type == "assistant" and .message.usage)) |
                last |
                .message.usage |
                (.input_tokens // 0) +
                (.output_tokens // 0) +
                (.cache_creation_input_tokens // 0) +
                (.cache_read_input_tokens // 0)' 2>/dev/null)
    fi
fi

# Context change tracking + tool info cache
STATE_DIR="$HOME/.claude/cache"
mkdir -p "$STATE_DIR"
STATE_FILE="${STATE_DIR}/context-${SESSION_ID:-$$}.state"
PREV_TOKENS=0
CONTEXT_DELTA=0

if [ -f "$STATE_FILE" ]; then
    IFS=$'\t' read -r PREV_TOKENS CACHED_TOOL CACHED_COUNT < "$STATE_FILE" 2>/dev/null
    [ -z "$PREV_TOKENS" ] && PREV_TOKENS=0
    [ -z "$CACHED_COUNT" ] && CACHED_COUNT=0
fi

if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
    CONTEXT_DELTA=$((CONTEXT_TOKENS - PREV_TOKENS))
fi

# Only read transcript when context has changed (skip costly tail+jq on cache hit)
if [ "$CONTEXT_DELTA" -ne 0 ] 2>/dev/null && [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    TOOL_INFO=$(tail -n 200 "$TRANSCRIPT_PATH" 2>/dev/null | \
        jq -s '[.[] | select(.type == "tool_use")] | last | .name // empty' 2>/dev/null)
    if [ -n "$TOOL_INFO" ] && [ "$TOOL_INFO" != "null" ]; then
        LAST_TOOL=$(echo "$TOOL_INFO" | tr -d '"')
    fi
    TOOL_COUNT=$(tail -n 500 "$TRANSCRIPT_PATH" 2>/dev/null | \
        jq -s '[.[] | select(.type == "tool_use")] | length' 2>/dev/null)
    [ -z "$TOOL_COUNT" ] && TOOL_COUNT=0
else
    LAST_TOOL="${CACHED_TOOL:-}"
    TOOL_COUNT="${CACHED_COUNT:-0}"
fi

# Save state (tokens + tool info)
if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
    printf '%s\t%s\t%s\n' "$CONTEXT_TOKENS" "$LAST_TOOL" "$TOOL_COUNT" > "$STATE_FILE"
fi

# --- Output ---

if [ -n "$MODEL_NAME" ]; then
    printf '\033[94m%s\033[0m' "$MODEL_NAME"
elif [ -n "$MODEL_ID" ]; then
    MODEL_SHORT=$(echo "$MODEL_ID" | sed -E 's/^(claude-)?//; s/-[0-9]{8}$//')
    printf '\033[94m%s\033[0m' "$MODEL_SHORT"
fi

if [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ]; then
    CONTEXT_TOKENS=0
fi

if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ] || [ "$CONTEXT_LIMIT" = "0" ]; then
    CONTEXT_LIMIT=200000
fi

if [ "$CONTEXT_LIMIT" -gt 0 ] 2>/dev/null; then
    if [ -n "$CONTEXT_USED_PCT" ] && [ "$CONTEXT_USED_PCT" != "null" ]; then
        PERCENTAGE=$(printf "%.0f" "$CONTEXT_USED_PCT" 2>/dev/null || echo "$CONTEXT_USED_PCT" | cut -d. -f1)
        REMAINING=$(printf "%.0f" "$CONTEXT_REMAINING_PCT" 2>/dev/null || echo "$CONTEXT_REMAINING_PCT" | cut -d. -f1)
    else
        PERCENTAGE=$((CONTEXT_TOKENS * 100 / CONTEXT_LIMIT))
        REMAINING=$((100 - PERCENTAGE))
    fi
    TOKENS_K=$((CONTEXT_TOKENS / 1000))
    LIMIT_K=$((CONTEXT_LIMIT / 1000))

    if [ "$REMAINING" -ge 45 ]; then
        CIRCLE="◔"
    elif [ "$REMAINING" -ge 20 ]; then
        CIRCLE="◑"
    else
        CIRCLE="◕"
    fi

    if [ "$EXCEEDS_200K" = "true" ]; then
        COLOR='\033[31;1m'
    elif [ $PERCENTAGE -lt 60 ]; then
        COLOR='\033[32m'
    elif [ $PERCENTAGE -lt 80 ]; then
        COLOR='\033[33m'
    else
        COLOR='\033[31m'
    fi

    if [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ]; then
        printf ' \033[90m│\033[0m '
    fi
    printf "${COLOR}%s %dk/%dk (%d%%)\033[0m" "$CIRCLE" "$TOKENS_K" "$LIMIT_K" "$PERCENTAGE"

    if [ "$CONTEXT_DELTA" -ne 0 ] 2>/dev/null; then
        DELTA_K=$((CONTEXT_DELTA / 1000))
        if [ "$DELTA_K" -ne 0 ] 2>/dev/null; then
            if [ "$CONTEXT_DELTA" -gt 0 ]; then
                printf ' \033[94m+%dk\033[0m' "$DELTA_K"
            else
                printf ' \033[35m-%dk\033[0m' "$((-DELTA_K))"
            fi
        fi
    fi

    if [ "$EXCEEDS_200K" = "true" ]; then
        printf ' \033[31;1m[!]\033[0m'
    fi
fi

if [ -n "$SESSION_COST" ] && [ "$SESSION_COST" != "null" ] && [ "$SESSION_COST" != "0" ]; then
    COST_FMT=$(printf "%.2f" "$SESSION_COST" 2>/dev/null || echo "$SESSION_COST")
    printf ' \033[90m│\033[0m \033[33m$%s\033[0m' "$COST_FMT"
fi

if [ -n "$LAST_TOOL" ] && [ "$LAST_TOOL" != "null" ]; then
    TOOL_SHORT="$LAST_TOOL"
    case "$LAST_TOOL" in
        Read) TOOL_SHORT="R" ;;
        Write) TOOL_SHORT="W" ;;
        Edit) TOOL_SHORT="E" ;;
        Bash) TOOL_SHORT="B" ;;
        Glob) TOOL_SHORT="G" ;;
        Grep) TOOL_SHORT="g" ;;
        Task) TOOL_SHORT="T" ;;
        WebFetch) TOOL_SHORT="WF" ;;
        WebSearch) TOOL_SHORT="WS" ;;
        TodoWrite) TOOL_SHORT="TD" ;;
        AskUserQuestion) TOOL_SHORT="?" ;;
    esac
    printf ' \033[90m│\033[0m \033[36m%s\033[0m' "$TOOL_SHORT"
    if [ "$TOOL_COUNT" -gt 0 ] 2>/dev/null; then
        printf '\033[90m(%d)\033[0m' "$TOOL_COUNT"
    fi
fi

printf ' \033[90m│\033[0m '

DIR=$(basename "$PWD")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)

printf '\033[96;1m%s\033[0m' "$DIR"

if [ -n "$BRANCH" ]; then
    printf ' on \033[95m%s\033[0m' "$BRANCH"

    { read -r GIT_DIR; read -r GIT_COMMON; } <<< "$(git rev-parse --git-dir --git-common-dir 2>/dev/null)"
    if [ -n "$GIT_COMMON" ] && [ "$GIT_COMMON" != "$GIT_DIR" ]; then
        printf ' \033[92m[wt]\033[0m'
    fi

    source "$(dirname "$0")/_pr-cache.sh" || true
fi
