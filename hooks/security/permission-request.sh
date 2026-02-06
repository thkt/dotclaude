#!/bin/bash
# PermissionRequest hook - auto-approve/deny based on path and tool rules
# Output: JSON with "decision": "approve" | "deny" | "ask"
set -euo pipefail

INPUT=$(cat)

if [[ -z "$INPUT" ]]; then
  echo '{"decision": "ask", "reason": "Empty input received"}'
  exit 0
fi

if ! echo "$INPUT" | jq empty 2>/dev/null; then
  echo '{"decision": "deny", "reason": "Malformed input"}'
  exit 0
fi

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // {}')
FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // .path // ""')

# === AUTO-DENY: Dangerous Bash commands ===
if [[ "$TOOL_NAME" == "Bash" ]]; then
  COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""')
  if [[ "$COMMAND" =~ ^(sudo|rm\ |rm$|git\ push.*--force|git\ reset\ --hard) ]]; then
    echo '{"decision": "deny", "reason": "Dangerous command blocked"}'
    exit 0
  fi
fi

# === AUTO-DENY: Sensitive file writes ===
if [[ "$TOOL_NAME" =~ ^(Write|Edit)$ ]]; then
  if [[ "$FILE_PATH" =~ \.(env|key|secret|token|credentials)($|\.) ]] ||
     [[ "$FILE_PATH" == *"id_rsa"* ]] || [[ "$FILE_PATH" == *"id_ed25519"* ]] ||
     [[ "$FILE_PATH" == *"secrets"* ]]; then
    echo '{"decision": "deny", "reason": "Sensitive file write blocked"}'
    exit 0
  fi
fi

# === ASK: Security-critical paths within .claude/ ===
if [[ "$FILE_PATH" == "$HOME/.claude/hooks/security/"* ]] ||
   [[ "$FILE_PATH" == "$HOME/.claude/CLAUDE.md" ]] ||
   [[ "$FILE_PATH" == "$HOME/.claude/settings.json" ]]; then
  echo '{"decision": "ask", "reason": "Security-critical configuration file"}'
  exit 0
fi

# === AUTO-APPROVE: .claude/ directory (except sensitive/security files) ===
if [[ "$FILE_PATH" == "$HOME/.claude/"* ]]; then
  echo '{"decision": "approve", "reason": "Claude configuration directory"}'
  exit 0
fi

# === DEFAULT ===
echo '{"decision": "ask", "reason": "Requires user confirmation"}'
exit 0
