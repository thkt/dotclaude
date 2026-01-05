#!/bin/bash
set -euo pipefail

# Claude Code Custom Status Line
# Features:
# - Model name with context usage (numeric + circular symbol)
# - Context change tracking (delta from last call)
# - Git branch with diff stats (+/-lines)
# - Session cost
# - Last used tool name

# Read JSON input from stdin
STDIN_INPUT=""
if [ ! -t 0 ]; then
    STDIN_INPUT=$(cat)
fi

# Parse JSON fields if jq is available
if [ -n "$STDIN_INPUT" ] && command -v jq &> /dev/null; then
    # Model info
    MODEL_NAME=$(echo "$STDIN_INPUT" | jq -r '.model.display_name // empty' 2>/dev/null)
    MODEL_ID=$(echo "$STDIN_INPUT" | jq -r '.model.id // empty' 2>/dev/null)

    # Session info for state tracking
    SESSION_ID=$(echo "$STDIN_INPUT" | jq -r '.session_id // empty' 2>/dev/null)
    TRANSCRIPT_PATH=$(echo "$STDIN_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

    # Session cost (v1.0.85+)
    SESSION_COST=$(echo "$STDIN_INPUT" | jq -r '.session_cost // empty' 2>/dev/null)

    # Context window warning (v1.0.85+)
    EXCEEDS_200K=$(echo "$STDIN_INPUT" | jq -r '.exceeds_200k_tokens // false' 2>/dev/null)

    # Current usage (v2.0.70+) - most accurate source
    CURRENT_USAGE=$(echo "$STDIN_INPUT" | jq -r '.current_usage // empty' 2>/dev/null)

    if [ -n "$CURRENT_USAGE" ] && [ "$CURRENT_USAGE" != "null" ]; then
        # Use current_usage for accurate context calculation
        CONTEXT_TOKENS=$(echo "$STDIN_INPUT" | jq -r '
            .current_usage.input_tokens +
            .current_usage.output_tokens +
            (.current_usage.cache_creation_input_tokens // 0) +
            (.current_usage.cache_read_input_tokens // 0)' 2>/dev/null)
    else
        # Fallback: Try multiple possible field names (v2.0.64+)
        CONTEXT_TOKENS=$(echo "$STDIN_INPUT" | jq -r '
            .context.tokens_used //
            .context_tokens //
            .tokens.context //
            .usage.total_tokens //
            empty' 2>/dev/null)

        # Fallback: Parse transcript if native fields unavailable
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

    # Context limit from current_usage or fallback
    CONTEXT_LIMIT=$(echo "$STDIN_INPUT" | jq -r '
        .current_usage.context_window //
        .context.limit //
        .context_limit //
        .tokens.limit //
        empty' 2>/dev/null)

    # Default context limit based on model
    if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ]; then
        if [[ "$MODEL_ID" == *"[1m]"* ]] || [[ "$MODEL_NAME" == *"[1m]"* ]]; then
            CONTEXT_LIMIT=1000000
        else
            CONTEXT_LIMIT=200000
        fi
    fi

    # === Extract last used tool from transcript ===
    LAST_TOOL=""
    TOOL_COUNT=0
    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        # Get last tool use from transcript
        TOOL_INFO=$(tail -n 200 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s '[.[] | select(.type == "tool_use")] | last | .name // empty' 2>/dev/null)
        if [ -n "$TOOL_INFO" ] && [ "$TOOL_INFO" != "null" ]; then
            LAST_TOOL=$(echo "$TOOL_INFO" | tr -d '"')
        fi

        # Count total tool calls in session
        TOOL_COUNT=$(tail -n 500 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s '[.[] | select(.type == "tool_use")] | length' 2>/dev/null)
        [ -z "$TOOL_COUNT" ] && TOOL_COUNT=0
    fi
fi

# === Context change tracking with state file ===
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

# === Output ===

# 1. Model name
if [ -n "$MODEL_NAME" ]; then
    printf '\033[94m%s\033[0m' "$MODEL_NAME"
elif [ -n "$MODEL_ID" ]; then
    MODEL_SHORT=$(echo "$MODEL_ID" | sed -E 's/^(claude-)?//; s/-[0-9]{8}$//')
    printf '\033[94m%s\033[0m' "$MODEL_SHORT"
fi

# 2. Context window usage with circular symbol
if [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ]; then
    CONTEXT_TOKENS=0
fi

# Default context limit if not set
if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ] || [ "$CONTEXT_LIMIT" = "0" ]; then
    if [[ "$MODEL_ID" == *"[1m]"* ]] || [[ "$MODEL_NAME" == *"[1m]"* ]]; then
        CONTEXT_LIMIT=1000000
    else
        CONTEXT_LIMIT=200000
    fi
fi

if [ "$CONTEXT_LIMIT" -gt 0 ] 2>/dev/null; then
    PERCENTAGE=$((CONTEXT_TOKENS * 100 / CONTEXT_LIMIT))
    REMAINING=$((100 - PERCENTAGE))
    TOKENS_K=$((CONTEXT_TOKENS / 1000))
    LIMIT_K=$((CONTEXT_LIMIT / 1000))

    # Circular symbol based on remaining percentage
    # ◔ = 45%+ remaining, ◑ = 20-44% remaining, ◕ = <20% remaining
    if [ "$REMAINING" -ge 45 ]; then
        CIRCLE="◔"
    elif [ "$REMAINING" -ge 20 ]; then
        CIRCLE="◑"
    else
        CIRCLE="◕"
    fi

    # Color based on usage
    if [ "$EXCEEDS_200K" = "true" ]; then
        COLOR='\033[31;1m'  # Bold red for exceeds
    elif [ $PERCENTAGE -lt 60 ]; then
        COLOR='\033[32m'    # Green
    elif [ $PERCENTAGE -lt 80 ]; then
        COLOR='\033[33m'    # Yellow
    else
        COLOR='\033[31m'    # Red
    fi

    if [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ]; then
        printf ' \033[90m│\033[0m '
    fi
    printf "${COLOR}%s %dk/%dk (%d%%)\033[0m" "$CIRCLE" "$TOKENS_K" "$LIMIT_K" "$PERCENTAGE"

    # Context delta (change from last call) - hide if zero
    if [ "$CONTEXT_DELTA" -ne 0 ] 2>/dev/null; then
        DELTA_K=$((CONTEXT_DELTA / 1000))
        if [ "$DELTA_K" -ne 0 ] 2>/dev/null; then
            if [ "$CONTEXT_DELTA" -gt 0 ]; then
                printf ' \033[94m+%dk\033[0m' "$DELTA_K"  # Blue for increase
            else
                printf ' \033[35m-%dk\033[0m' "$((-DELTA_K))"  # Purple for decrease
            fi
        fi
    fi

    # Warning if exceeds 200k
    if [ "$EXCEEDS_200K" = "true" ]; then
        printf ' \033[31;1m[!]\033[0m'
    fi
fi

# 3. Session cost (if available)
if [ -n "$SESSION_COST" ] && [ "$SESSION_COST" != "null" ] && [ "$SESSION_COST" != "0" ]; then
    printf ' \033[90m│\033[0m \033[33m$%s\033[0m' "$SESSION_COST"
fi

# 4. Last used tool (if available)
if [ -n "$LAST_TOOL" ] && [ "$LAST_TOOL" != "null" ]; then
    # Shorten common tool names
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

# Separator before git info
printf ' \033[90m│\033[0m '

# 5. Directory and git info with diff stats
DIR=$(basename "$PWD")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

printf '\033[96;1m%s\033[0m' "$DIR"

if [ -n "$BRANCH" ]; then
    printf ' on \033[95m%s\033[0m' "$BRANCH"

    # Git diff stats (added/removed lines)
    DIFF_STAT=$(git diff --numstat 2>/dev/null | awk '{add+=$1; del+=$2} END {print add" "del}')
    STAGED_STAT=$(git diff --cached --numstat 2>/dev/null | awk '{add+=$1; del+=$2} END {print add" "del}')

    ADDED=$(echo "$DIFF_STAT $STAGED_STAT" | awk '{print $1+$3}')
    DELETED=$(echo "$DIFF_STAT $STAGED_STAT" | awk '{print $2+$4}')

    # Handle empty/null values
    [ -z "$ADDED" ] && ADDED=0
    [ -z "$DELETED" ] && DELETED=0

    if [ "$ADDED" -gt 0 ] || [ "$DELETED" -gt 0 ]; then
        printf ' '
        if [ "$ADDED" -gt 0 ]; then
            printf '\033[32m+%s\033[0m' "$ADDED"
        fi
        if [ "$DELETED" -gt 0 ]; then
            if [ "$ADDED" -gt 0 ]; then
                printf '\033[90m/\033[0m'  # Gray slash
            fi
            printf '\033[31m-%s\033[0m' "$DELETED"
        fi
    fi
fi
