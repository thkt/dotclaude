#!/bin/bash
set -euo pipefail

# Claude Code status line: model, context, cost, tool, git branch

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
    MODEL_NAME=$(echo "$STDIN_INPUT" | jq -r '.model.display_name // empty' 2>/dev/null)
    MODEL_ID=$(echo "$STDIN_INPUT" | jq -r '.model.id // empty' 2>/dev/null)
    SESSION_ID=$(echo "$STDIN_INPUT" | jq -r '.session_id // empty' 2>/dev/null)
    TRANSCRIPT_PATH=$(echo "$STDIN_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
    SESSION_COST=$(echo "$STDIN_INPUT" | jq -r '.session_cost // empty' 2>/dev/null)
    EXCEEDS_200K=$(echo "$STDIN_INPUT" | jq -r '.exceeds_200k_tokens // false' 2>/dev/null)
    CURRENT_USAGE=$(echo "$STDIN_INPUT" | jq -r '.current_usage // empty' 2>/dev/null)

    if [ -n "$CURRENT_USAGE" ] && [ "$CURRENT_USAGE" != "null" ]; then
        CONTEXT_TOKENS=$(echo "$STDIN_INPUT" | jq -r '
            .current_usage.input_tokens +
            .current_usage.output_tokens +
            (.current_usage.cache_creation_input_tokens // 0) +
            (.current_usage.cache_read_input_tokens // 0)' 2>/dev/null)
    else
        CONTEXT_TOKENS=$(echo "$STDIN_INPUT" | jq -r '
            .context.tokens_used //
            .context_tokens //
            .tokens.context //
            .usage.total_tokens //
            empty' 2>/dev/null)

        if [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ]; then
            if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
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
    fi

    CONTEXT_LIMIT=$(echo "$STDIN_INPUT" | jq -r '
        .current_usage.context_window //
        .context.limit //
        .context_limit //
        .tokens.limit //
        empty' 2>/dev/null)

    CONTEXT_USED_PCT=$(echo "$STDIN_INPUT" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)
    CONTEXT_REMAINING_PCT=$(echo "$STDIN_INPUT" | jq -r '.context_window.remaining_percentage // empty' 2>/dev/null)

    LAST_TOOL=""
    TOOL_COUNT=0
    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        TOOL_INFO=$(tail -n 200 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s '[.[] | select(.type == "tool_use")] | last | .name // empty' 2>/dev/null)
        if [ -n "$TOOL_INFO" ] && [ "$TOOL_INFO" != "null" ]; then
            LAST_TOOL=$(echo "$TOOL_INFO" | tr -d '"')
        fi

        TOOL_COUNT=$(tail -n 500 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s '[.[] | select(.type == "tool_use")] | length' 2>/dev/null)
        [ -z "$TOOL_COUNT" ] && TOOL_COUNT=0
    fi
fi

# Context change tracking
STATE_FILE="/tmp/claude-context-${SESSION_ID:-default}.state"
PREV_TOKENS=0
CONTEXT_DELTA=0

if [ -f "$STATE_FILE" ]; then
    PREV_TOKENS=$(cat "$STATE_FILE" 2>/dev/null)
    [ -z "$PREV_TOKENS" ] && PREV_TOKENS=0
fi

if [ -n "$CONTEXT_TOKENS" ] && [ "$CONTEXT_TOKENS" != "null" ] && [ "$CONTEXT_TOKENS" -gt 0 ] 2>/dev/null; then
    CONTEXT_DELTA=$((CONTEXT_TOKENS - PREV_TOKENS))
    echo "$CONTEXT_TOKENS" > "$STATE_FILE"
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
    printf ' \033[90m│\033[0m \033[33m$%s\033[0m' "$SESSION_COST"
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

    if command -v gh &>/dev/null && command -v jq &>/dev/null; then
        CACHE_DIR="$HOME/.claude/cache"
        CACHE_FILE="$CACHE_DIR/statusline-pr-cache.json"
        CACHE_TTL_SEC="${STATUSLINE_PR_CACHE_TTL_SEC:-300}"
        REPO=$(git remote get-url origin 2>/dev/null | sed -E 's#\.git$##; s#.*[:/](.*/.*)#\1#; s#.*://[^/]*/##' || true)

        if [ -n "$REPO" ]; then
            CACHE_KEY="${REPO}:${BRANCH}"
            NOW=$(date +%s)
            HIT=""

            if [ -f "$CACHE_FILE" ]; then
                CACHED=$(jq -r --arg k "$CACHE_KEY" '.[$k] // empty' "$CACHE_FILE" 2>/dev/null)
                if [ -n "$CACHED" ]; then
                    CACHED_AT=$(echo "$CACHED" | jq -r '.cached_at // 0')
                    if [ $((NOW - CACHED_AT)) -lt "$CACHE_TTL_SEC" ]; then
                        HIT=1
                        PR_URL=$(echo "$CACHED" | jq -r '.url // empty')
                        PR_NUM=$(echo "$CACHED" | jq -r '.number // empty')
                        PR_STATE=$(echo "$CACHED" | jq -r '.state // empty')
                    fi
                fi
            fi

            if [ -z "$HIT" ]; then
                if command -v timeout &>/dev/null; then
                    PR_JSON=$(timeout 3 gh pr view --json url,number,state 2>/dev/null || echo '{}')
                elif command -v perl &>/dev/null; then
                    PR_JSON=$(perl -e 'alarm 3; exec @ARGV' gh pr view --json url,number,state 2>/dev/null || echo '{}')
                else
                    PR_JSON=$(gh pr view --json url,number,state 2>/dev/null || echo '{}')
                fi
                PR_URL=$(echo "$PR_JSON" | jq -r '.url // empty')
                PR_NUM=$(echo "$PR_JSON" | jq -r '.number // empty')
                PR_STATE=$(echo "$PR_JSON" | jq -r '.state // empty')

                mkdir -p "$CACHE_DIR"
                ENTRY=$(jq -n --arg u "$PR_URL" --arg n "$PR_NUM" --arg s "$PR_STATE" --argjson t "$NOW" \
                    '{url:$u, number:$n, state:$s, cached_at:$t}')
                if [ -f "$CACHE_FILE" ]; then
                    EXISTING=$(cat "$CACHE_FILE")
                else
                    EXISTING='{}'
                fi
                echo "$EXISTING" | jq --argjson t "$NOW" --arg k "$CACHE_KEY" --argjson v "$ENTRY" \
                    '[to_entries[] | select(.value.cached_at > ($t - 86400))] | from_entries | .[$k] = $v' \
                    > "$CACHE_FILE.tmp" 2>/dev/null \
                    && mv "$CACHE_FILE.tmp" "$CACHE_FILE"
            fi

            if [ -n "$PR_NUM" ] && [ "$PR_NUM" != "null" ] && [ "$PR_STATE" = "OPEN" ]; then
                printf ' \033]8;;%s\033\\\033[93m[PR#%s]\033[0m\033]8;;\033\\' "$PR_URL" "$PR_NUM"
            fi
        fi
    fi
fi
