#!/bin/bash
# Minimal biome hook for Claude Code
# Reads JSON from stdin, extracts code, runs biome check

INPUT=$(cat)
CODE=$(echo "$INPUT" | jq -r '.tool_input.content')
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Run biome and capture result
RESULT=$(echo "$CODE" | biome check --stdin-file-path="$FILE" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "$RESULT" >&2
fi

exit $EXIT_CODE
