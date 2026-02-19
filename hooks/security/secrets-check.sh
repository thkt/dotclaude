#!/bin/zsh
# Failure mode: fail-closed (block on error)
# Exit: 0=allow, 2=block
set -euo pipefail

LOG_FILE="$HOME/.claude/logs/secrets-check.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || echo "WARNING: log dir creation failed" >&2

log_block() {
  printf '[%s] BLOCKED file="%s" pattern="%s"\n' \
    "$(date '+%Y-%m-%d %H:%M:%S')" "$1" "$2" >> "$LOG_FILE" 2>/dev/null || \
    echo "WARNING: log write failed" >&2
}

command -v jq &>/dev/null || { echo "BLOCKED: jq required" >&2; exit 2; }

INPUT=$(</dev/stdin)
[[ -z "$INPUT" ]] && exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null) || exit 0
[[ -z "$COMMAND" ]] && exit 0

[[ "$COMMAND" =~ ^git[[:space:]]+commit ]] || exit 0

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null) || exit 0
[[ -z "$STAGED_FILES" ]] && exit 0

DANGEROUS_PATTERNS=(
  # Environment & secrets
  '\.env$'
  '\.env\.[^example][^sample]'
  '\.secret$'
  '\.secrets$'
  # Private keys & certificates
  '\.pem$'
  '\.key$'
  '\.p12$'
  '\.pfx$'
  'id_rsa$'
  'id_ed25519$'
  # Cloud credentials
  'credentials\.csv$'
  'service-account.*\.json$'
  'gcloud-service-key\.json$'
  '\.aws/credentials$'
  # Database dumps
  '\.sqlite3?$'
  'dump\.sql$'
  '\.sql\.gz$'
  # Tokens
  '\.token$'
  'token\.json$'
  'credentials\.json$'
)

BLOCKED_FILES=()

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if [[ "$file" =~ $pattern ]]; then
      BLOCKED_FILES+=("$file ($pattern)")
      log_block "$file" "$pattern"
      break
    fi
  done
done <<< "$STAGED_FILES"

if (( ${#BLOCKED_FILES[@]} > 0 )); then
  FILE_LIST="${(j:, :)BLOCKED_FILES}"
  jq -n --arg files "$FILE_LIST" '{
    decision: "block",
    reason: ("Sensitive files staged for commit: " + $files),
    additionalContext: "These files may contain secrets. Remove them with `git reset HEAD <file>` before committing. If intentional, use `git commit --no-verify` (requires user approval)."
  }' && exit 0
  echo "BLOCKED: sensitive files in staged area" >&2
  exit 2
fi

exit 0
