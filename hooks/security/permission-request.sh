#!/bin/zsh
# PermissionRequest hook - auto-approve/deny based on path and tool rules
# Failure mode: fail-closed (deny on malformed input, ask on error)
# Output: JSON with "decision": "approve" | "deny" | "ask"
set -euo pipefail

command -v jq &>/dev/null || { echo '{"decision": "deny", "reason": "jq not available"}'; exit 0; }

INPUT=$(</dev/stdin)

if [[ -z "$INPUT" ]]; then
  echo '{"decision": "ask", "reason": "Empty input received"}'
  exit 0
fi

if ! jq empty <<< "$INPUT" 2>/dev/null; then
  echo '{"decision": "deny", "reason": "Malformed input"}'
  exit 0
fi

TOOL_NAME=$(jq -r '.tool_name // "unknown"' <<< "$INPUT")
FILE_PATH=$(jq -r '.tool_input.file_path // .tool_input.path // ""' <<< "$INPUT")
FILE_PATH="${FILE_PATH:a}"
# Deny unresolved path traversal
if [[ "$FILE_PATH" == *".."* ]]; then
  echo '{"decision": "deny", "reason": "Path traversal detected"}'
  exit 0
fi

# Sensitive file access → deny writes, ask reads
if [[ "$FILE_PATH" =~ \.(env|key|secret|token|credentials)($|\.) ]] ||
   [[ "$FILE_PATH" == *"/.ssh/id_rsa"* ]] || [[ "$FILE_PATH" == *"/.ssh/id_ed25519"* ]] ||
   [[ "$FILE_PATH" == */secrets/* ]]; then
  if [[ "$TOOL_NAME" =~ ^(Write|Edit|MultiEdit)$ ]]; then
    echo '{"decision": "deny", "reason": "Sensitive file write blocked"}'
    exit 0
  elif [[ "$TOOL_NAME" == "Read" ]]; then
    echo '{"decision": "ask", "reason": "Reading sensitive file"}'
    exit 0
  fi
fi

# Security-critical .claude/ paths → ask
if [[ "$FILE_PATH" == "$HOME/.claude/hooks/security/"* ]] ||
   [[ "$FILE_PATH" == "$HOME/.claude/CLAUDE.md" ]] ||
   [[ "$FILE_PATH" == "$HOME/.claude/settings.json" ]]; then
  echo '{"decision": "ask", "reason": "Security-critical configuration file"}'
  exit 0
fi

# All hooks → ask (prevent self-modification attacks)
if [[ "$FILE_PATH" == "$HOME/.claude/hooks/"* ]]; then
  echo '{"decision": "ask", "reason": "Hook script modification"}'
  exit 0
fi

# .claude/ directory (non-security, non-hooks) → approve
if [[ "$FILE_PATH" == "$HOME/.claude/"* ]]; then
  echo '{"decision": "approve", "reason": "Claude configuration directory"}'
  exit 0
fi

echo '{"decision": "ask", "reason": "Requires user confirmation"}'
exit 0
