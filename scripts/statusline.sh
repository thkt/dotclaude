#!/bin/bash

# Read JSON input from STDIN if available
if [ ! -t 0 ]; then
    STDIN_INPUT=$(cat)
fi

# Get directory name
DIR=$(basename "$PWD")

# Get git branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Count git changes
CHANGES=$(git status --porcelain 2>/dev/null | wc -l | xargs)

# Build status line with colors matching Starship
printf '\033[96;1m%s\033[0m' "$DIR"  # bright cyan bold
if [ -n "$BRANCH" ]; then
    printf ' on \033[95m%s\033[0m' "$BRANCH"  # bright-purple
fi
if [ "$CHANGES" -gt 0 ]; then
    if [ "$CHANGES" -eq 1 ]; then
        printf ' \033[31;1m[*] (1 change)\033[0m'  # red bold
    else
        printf ' \033[31;1m[*] (%s changes)\033[0m' "$CHANGES"  # red bold
    fi
fi

# Check if context exceeds 200k tokens from STDIN JSON
if [ -n "$STDIN_INPUT" ]; then
    # Extract exceeds_200k_tokens using jq if available
    if command -v jq &> /dev/null; then
        EXCEEDS=$(echo "$STDIN_INPUT" | jq -r '.exceeds_200k_tokens // empty' 2>/dev/null)
        if [ "$EXCEEDS" = "true" ] || [ "$EXCEEDS" = "1" ]; then
            printf ' \033[33;1m⚠ 200k+ tokens\033[0m'  # yellow bold warning
        fi
    fi
fi
