#!/bin/bash

if [ ! -t 0 ]; then
    STDIN_INPUT=$(cat)
fi

if [ -n "$STDIN_INPUT" ] && command -v jq &> /dev/null; then
    MODEL_ID=$(echo "$STDIN_INPUT" | jq -r '.model.id // empty' 2>/dev/null)
    MODEL_NAME=$(echo "$STDIN_INPUT" | jq -r '.model.display_name // empty' 2>/dev/null)
    TRANSCRIPT_PATH=$(echo "$STDIN_INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)

    if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
        TOKENS_USED=$(tail -n 100 "$TRANSCRIPT_PATH" 2>/dev/null | \
            jq -s 'map(select(.type == "assistant" and .message.usage)) |
                last |
                .message.usage |
                (.input_tokens // 0) +
                (.output_tokens // 0) +
                (.cache_creation_input_tokens // 0) +
                (.cache_read_input_tokens // 0)' 2>/dev/null)
        BUDGET_TOKENS=200000
    fi
fi

if [ -n "$MODEL_NAME" ]; then
    printf '\033[94m%s\033[0m' "$MODEL_NAME"
elif [ -n "$MODEL_ID" ]; then
    MODEL_SHORT=$(echo "$MODEL_ID" | sed -E 's/^(claude-)?//; s/-[0-9]{8}$//')
    printf '\033[94m%s\033[0m' "$MODEL_SHORT"
fi

if [ -n "$TOKENS_USED" ] && [ -n "$BUDGET_TOKENS" ] && [ "$BUDGET_TOKENS" -gt 0 ]; then
    PERCENTAGE=$((TOKENS_USED * 100 / BUDGET_TOKENS))
    TOKENS_K=$((TOKENS_USED / 1000))
    BUDGET_K=$((BUDGET_TOKENS / 1000))

    if [ $PERCENTAGE -lt 60 ]; then
        COLOR='\033[32m'
    elif [ $PERCENTAGE -lt 80 ]; then
        COLOR='\033[33m'
    else
        COLOR='\033[31m'
    fi

    if [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ]; then
        printf ' | '
    fi
    printf "${COLOR}%dk/%dk (%d%%)\033[0m" "$TOKENS_K" "$BUDGET_K" "$PERCENTAGE"
fi

if [ -n "$MODEL_NAME" ] || [ -n "$MODEL_ID" ] || [ -n "$TOKENS_USED" ]; then
    printf ' | '
fi

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
