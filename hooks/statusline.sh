#!/bin/bash

# Read JSON input from stdin
if [ ! -t 0 ]; then
    STDIN_INPUT=$(cat)
fi

# Parse JSON fields if jq is available
if [ -n "$STDIN_INPUT" ] && command -v jq &> /dev/null; then
    # Model info
    MODEL_NAME=$(echo "$STDIN_INPUT" | jq -r '.model.display_name // empty' 2>/dev/null)
    MODEL_ID=$(echo "$STDIN_INPUT" | jq -r '.model.id // empty' 2>/dev/null)

    # Session cost (v1.0.85+)
    SESSION_COST=$(echo "$STDIN_INPUT" | jq -r '.session_cost // empty' 2>/dev/null)

    # Context window warning (v1.0.85+)
    EXCEEDS_200K=$(echo "$STDIN_INPUT" | jq -r '.exceeds_200k_tokens // false' 2>/dev/null)

    # Native context window info (v2.0.64+)
    # Try multiple possible field names
    CONTEXT_TOKENS=$(echo "$STDIN_INPUT" | jq -r '
        .context.tokens_used //
        .context_tokens //
        .tokens.context //
        .usage.total_tokens //
        empty' 2>/dev/null)

    CONTEXT_LIMIT=$(echo "$STDIN_INPUT" | jq -r '
        .context.limit //
        .context_limit //
        .tokens.limit //
        empty' 2>/dev/null)

    # Fallback: Parse transcript if native fields unavailable
    if [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ]; then
        TRANSCRIPT_PATH=$(echo "$STDIN_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
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

    # Default context limit based on model
    if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ]; then
        if [[ "$MODEL_ID" == *"[1m]"* ]] || [[ "$MODEL_NAME" == *"[1m]"* ]]; then
            CONTEXT_LIMIT=1000000
        else
            CONTEXT_LIMIT=200000
        fi
    fi
fi

# === Output ===

# 1. Model name
if [ -n "$MODEL_NAME" ]; then
    printf '\033[94m%s\033[0m' "$MODEL_NAME"
elif [ -n "$MODEL_ID" ]; then
    MODEL_SHORT=$(echo "$MODEL_ID" | sed -E 's/^(claude-)?//; s/-[0-9]{8}$//')
    printf '\033[94m%s\033[0m' "$MODEL_SHORT"
fi

# 2. Context window usage (always show, default to 0 if no data)
if [ -z "$CONTEXT_TOKENS" ] || [ "$CONTEXT_TOKENS" = "null" ]; then
    CONTEXT_TOKENS=0
fi

# Default context limit if not set (outside JSON parsing block)
if [ -z "$CONTEXT_LIMIT" ] || [ "$CONTEXT_LIMIT" = "null" ] || [ "$CONTEXT_LIMIT" = "0" ]; then
    if [[ "$MODEL_ID" == *"[1m]"* ]] || [[ "$MODEL_NAME" == *"[1m]"* ]]; then
        CONTEXT_LIMIT=1000000
    else
        CONTEXT_LIMIT=200000
    fi
fi

if [ "$CONTEXT_LIMIT" -gt 0 ] 2>/dev/null; then
    PERCENTAGE=$((CONTEXT_TOKENS * 100 / CONTEXT_LIMIT))
    TOKENS_K=$((CONTEXT_TOKENS / 1000))
    LIMIT_K=$((CONTEXT_LIMIT / 1000))

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
        printf ' | '
    fi
    printf "${COLOR}%dk/%dk (%d%%)\033[0m" "$TOKENS_K" "$LIMIT_K" "$PERCENTAGE"

    # Warning if exceeds 200k
    if [ "$EXCEEDS_200K" = "true" ]; then
        printf ' \033[31;1m[!]\033[0m'
    fi
fi

# 3. Session cost (if available)
if [ -n "$SESSION_COST" ] && [ "$SESSION_COST" != "null" ] && [ "$SESSION_COST" != "0" ]; then
    printf ' | \033[33m$%s\033[0m' "$SESSION_COST"
fi

# Separator before git info
if [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ] || [ -n "$CONTEXT_TOKENS" ] || [ -n "$SESSION_COST" ]; then
    printf ' | '
fi

# 4. Directory and git info
DIR=$(basename "$PWD")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | xargs)

printf '\033[96;1m%s\033[0m' "$DIR"
if [ -n "$BRANCH" ]; then
    printf ' on \033[95m%s\033[0m' "$BRANCH"
fi
if [ "$CHANGES" -gt 0 ]; then
    if [ "$CHANGES" -eq 1 ]; then
        printf ' \033[31;1m[*] (1 change)\033[0m'
    else
        printf ' \033[31;1m[*] (%s changes)\033[0m' "$CHANGES"
    fi
fi
