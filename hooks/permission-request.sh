#!/bin/bash
# PermissionRequest hook for Claude Code
# Automatically approves/denies tool permission requests based on rules
#
# Input: JSON via stdin with fields:
#   - tool_name: string
#   - tool_input: object (tool parameters)
#   - context: object (additional context)
#
# Output: JSON with "decision" field:
#   - "approve": Auto-approve
#   - "deny": Auto-deny
#   - "ask": Ask user for confirmation

set -euo pipefail

# Read JSON input
INPUT=$(cat)

# Guard against empty input
if [[ -z "$INPUT" ]]; then
  echo '{"decision": "ask", "reason": "Empty input received"}'
  exit 0
fi

# Parse tool name and input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')

# Debug logging (optional, comment out in production)
# echo "DEBUG: Tool=$TOOL_NAME Input=$TOOL_INPUT" >> ~/.claude/logs/permission-debug.log

# === AUTO-APPROVE RULES ===

# 1. Read-only operations (safe)
case "$TOOL_NAME" in
  Read|Grep|Glob|LS|BashOutput|ListMcpResourcesTool|ReadMcpResourceTool)
    # Check if reading .env or sensitive files
    if echo "$TOOL_INPUT" | jq -e '.file_path // .path // "" | test("\\.env|token|key|secret|id_rsa|id_ed25519"; "i")' > /dev/null 2>&1; then
      echo '{"decision": "deny", "reason": "Sensitive file access blocked"}'
      exit 0
    fi
    echo '{"decision": "approve", "reason": "Read-only operation"}'
    exit 0
    ;;
esac

# 2. .claude/ directory operations (project configuration)
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // ""')
if [[ "$FILE_PATH" == *"/.claude/"* ]] || [[ "$FILE_PATH" == "$HOME/.claude/"* ]]; then
  # Still block .env files
  if [[ "$FILE_PATH" == *".env"* ]]; then
    echo '{"decision": "deny", "reason": ".env file access blocked"}'
    exit 0
  fi
  echo '{"decision": "approve", "reason": "Claude configuration directory"}'
  exit 0
fi

# 3. Test commands (npm test, yarn test, etc.)
if [[ "$TOOL_NAME" == "Bash" ]]; then
  COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""')

  # Test commands
  if echo "$COMMAND" | grep -qE "^(npm|yarn|pnpm|bun) (test|t)($| )"; then
    echo '{"decision": "approve", "reason": "Test command"}'
    exit 0
  fi

  # Safe git read commands
  if echo "$COMMAND" | grep -qE "^git (status|log|diff|show|branch|remote|ls-files)"; then
    echo '{"decision": "approve", "reason": "Safe git read command"}'
    exit 0
  fi
fi

# 4. TodoWrite (task tracking)
if [[ "$TOOL_NAME" == "TodoWrite" ]]; then
  echo '{"decision": "approve", "reason": "Task tracking"}'
  exit 0
fi

# === AUTO-DENY RULES ===

# 1. Dangerous commands
if [[ "$TOOL_NAME" == "Bash" ]]; then
  COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""')

  # Explicitly blocked commands
  if echo "$COMMAND" | grep -qE "^(sudo|rm|git push|git reset|git rebase)"; then
    echo '{"decision": "deny", "reason": "Dangerous command blocked by policy"}'
    exit 0
  fi
fi

# 2. .env file writes
if [[ "$TOOL_NAME" =~ ^(Write|Edit)$ ]]; then
  if [[ "$FILE_PATH" == *".env"* ]] || [[ "$FILE_PATH" == *"secrets"* ]]; then
    echo '{"decision": "deny", "reason": "Sensitive file write blocked"}'
    exit 0
  fi
fi

# === DEFAULT: ASK USER ===
echo '{"decision": "ask", "reason": "Requires user confirmation"}'
exit 0
