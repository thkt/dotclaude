#!/bin/bash
# RTK auto-rewrite hook for Claude Code PreToolUse:Bash
# Transparently rewrites raw commands to their rtk equivalents.
# Outputs JSON with updatedInput to modify the command before execution.

# Guards: skip silently if dependencies missing
if ! command -v rtk &>/dev/null || ! command -v jq &>/dev/null; then
  exit 0
fi

set -euo pipefail

INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$CMD" ]; then
  exit 0
fi

FIRST_CMD="$CMD"

# Skip if already using rtk
case "$FIRST_CMD" in
  rtk\ *|*/rtk\ *) exit 0 ;;
esac

# Skip commands with heredocs
case "$FIRST_CMD" in
  *'<<'*) exit 0 ;;
esac

# Strip leading env var assignments for pattern matching
ENV_PREFIX=$(echo "$FIRST_CMD" | grep -oE '^([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)+' || echo "")
if [ -n "$ENV_PREFIX" ]; then
  MATCH_CMD="${FIRST_CMD:${#ENV_PREFIX}}"
  CMD_BODY="${CMD:${#ENV_PREFIX}}"
else
  MATCH_CMD="$FIRST_CMD"
  CMD_BODY="$CMD"
fi

REWRITTEN=""

# --- Helper: simple rewrite (match then sed replace) ---
# Usage: try_rewrite 'grep_pattern' 'sed_pattern' 'sed_replacement'
try_rewrite() {
  if [ -n "$REWRITTEN" ]; then return 1; fi
  if echo "$MATCH_CMD" | grep -qE "$1"; then
    REWRITTEN="${ENV_PREFIX}$(echo "$CMD_BODY" | sed -E "s#$2#$3#")"
    return 0
  fi
  return 1
}

# --- Subcommand-filtered rewrites (git, cargo, docker, kubectl) ---
if echo "$MATCH_CMD" | grep -qE '^git[[:space:]]'; then
  GIT_SUBCMD=$(echo "$MATCH_CMD" | sed -E \
    -e 's/^git[[:space:]]+//' \
    -e 's/(-C|-c)[[:space:]]+[^[:space:]]+[[:space:]]*//g' \
    -e 's/--[a-z-]+=[^[:space:]]+[[:space:]]*//g' \
    -e 's/--(no-pager|no-optional-locks|bare|literal-pathspecs)[[:space:]]*//g' \
    -e 's/^[[:space:]]+//')
  case "$GIT_SUBCMD" in
    status|status\ *|diff|diff\ *|log|log\ *|add|add\ *|commit|commit\ *|\
    push|push\ *|pull|pull\ *|branch|branch\ *|fetch|fetch\ *|stash|stash\ *|\
    show|show\ *)
      REWRITTEN="${ENV_PREFIX}rtk $CMD_BODY"
      ;;
  esac

elif echo "$MATCH_CMD" | grep -qE '^cargo[[:space:]]'; then
  CARGO_SUBCMD=$(echo "$MATCH_CMD" | sed -E 's/^cargo[[:space:]]+(\+[^[:space:]]+[[:space:]]+)?//')
  case "$CARGO_SUBCMD" in
    test|test\ *|build|build\ *|clippy|clippy\ *|check|check\ *|\
    install|install\ *|fmt|fmt\ *)
      REWRITTEN="${ENV_PREFIX}rtk $CMD_BODY"
      ;;
  esac

elif echo "$MATCH_CMD" | grep -qE '^docker[[:space:]]'; then
  if echo "$MATCH_CMD" | grep -qE '^docker[[:space:]]+compose([[:space:]]|$)'; then
    COMPOSE_SUBCMD=$(echo "$MATCH_CMD" | sed -E 's/^docker[[:space:]]+compose[[:space:]]*//')
    case "$COMPOSE_SUBCMD" in
      ps|ps\ *|logs|logs\ *|build|build\ *)
        REWRITTEN="${ENV_PREFIX}$(echo "$CMD_BODY" | sed 's/^docker /rtk docker /')"
        ;;
    esac
  else
    DOCKER_SUBCMD=$(echo "$MATCH_CMD" | sed -E \
      -e 's/^docker[[:space:]]+//' \
      -e 's/(-H|--context|--config)[[:space:]]+[^[:space:]]+[[:space:]]*//g' \
      -e 's/--[a-z-]+=[^[:space:]]+[[:space:]]*//g' \
      -e 's/^[[:space:]]+//')
    case "$DOCKER_SUBCMD" in
      ps|ps\ *|images|images\ *|logs|logs\ *|run|run\ *|build|build\ *|exec|exec\ *)
        REWRITTEN="${ENV_PREFIX}$(echo "$CMD_BODY" | sed 's/^docker /rtk docker /')"
        ;;
    esac
  fi

elif echo "$MATCH_CMD" | grep -qE '^kubectl[[:space:]]'; then
  KUBE_SUBCMD=$(echo "$MATCH_CMD" | sed -E \
    -e 's/^kubectl[[:space:]]+//' \
    -e 's/(--context|--kubeconfig|--namespace|-n)[[:space:]]+[^[:space:]]+[[:space:]]*//g' \
    -e 's/--[a-z-]+=[^[:space:]]+[[:space:]]*//g' \
    -e 's/^[[:space:]]+//')
  case "$KUBE_SUBCMD" in
    get|get\ *|logs|logs\ *|describe|describe\ *|apply|apply\ *)
      REWRITTEN="${ENV_PREFIX}$(echo "$CMD_BODY" | sed 's/^kubectl /rtk kubectl /')"
      ;;
  esac

# --- Special transform: head → rtk read ---
elif echo "$MATCH_CMD" | grep -qE '^head[[:space:]]+'; then
  if echo "$MATCH_CMD" | grep -qE '^head[[:space:]]+-[0-9]+[[:space:]]+'; then
    LINES=$(echo "$MATCH_CMD" | sed -E 's/^head +-([0-9]+) +.+$/\1/')
    FILE=$(echo "$MATCH_CMD" | sed -E 's/^head +-[0-9]+ +(.+)$/\1/')
    REWRITTEN="${ENV_PREFIX}rtk read $FILE --max-lines $LINES"
  elif echo "$MATCH_CMD" | grep -qE '^head[[:space:]]+--lines=[0-9]+[[:space:]]+'; then
    LINES=$(echo "$MATCH_CMD" | sed -E 's/^head +--lines=([0-9]+) +.+$/\1/')
    FILE=$(echo "$MATCH_CMD" | sed -E 's/^head +--lines=[0-9]+ +(.+)$/\1/')
    REWRITTEN="${ENV_PREFIX}rtk read $FILE --max-lines $LINES"
  fi

# --- Table-driven rewrites ---
# File operations
else
  # File operations
  try_rewrite '^(cat|bat)[[:space:]]+' '^(cat|bat) ' 'rtk read ' ||
  try_rewrite '^(rg|grep)[[:space:]]+' '^(rg|grep) ' 'rtk grep ' ||
  try_rewrite '^(ls|eza)([[:space:]]|$)' '^(ls|eza)' 'rtk ls' ||
  try_rewrite '^tree([[:space:]]|$)' '^tree' 'rtk tree' ||
  try_rewrite '^(find|fd)[[:space:]]+' '^(find|fd) ' 'rtk find ' ||
  try_rewrite '^diff[[:space:]]+' '^diff ' 'rtk diff ' ||
  # GitHub CLI
  try_rewrite '^gh[[:space:]]+(pr|issue|run|api|release)([[:space:]]|$)' '^gh ' 'rtk gh ' ||
  # JS/TS tooling
  try_rewrite '^(pnpm[[:space:]]+)?(npx[[:space:]]+)?vitest([[:space:]]|$)' '^(pnpm )?(npx )?vitest( run)?' 'rtk vitest run' ||
  try_rewrite '^pnpm[[:space:]]+test([[:space:]]|$)' '^pnpm test' 'rtk vitest run' ||
  try_rewrite '^npm[[:space:]]+test([[:space:]]|$)' '^npm test' 'rtk npm test' ||
  try_rewrite '^npm[[:space:]]+run[[:space:]]+' '^npm run ' 'rtk npm ' ||
  try_rewrite '^(npx[[:space:]]+)?vue-tsc([[:space:]]|$)' '^(npx )?vue-tsc' 'rtk tsc' ||
  try_rewrite '^pnpm[[:space:]]+tsc([[:space:]]|$)' '^pnpm tsc' 'rtk tsc' ||
  try_rewrite '^(npx[[:space:]]+)?tsc([[:space:]]|$)' '^(npx )?tsc' 'rtk tsc' ||
  try_rewrite '^pnpm[[:space:]]+lint([[:space:]]|$)' '^pnpm lint' 'rtk lint' ||
  try_rewrite '^(npx[[:space:]]+)?eslint([[:space:]]|$)' '^(npx )?eslint' 'rtk lint' ||
  try_rewrite '^(npx[[:space:]]+)?prettier([[:space:]]|$)' '^(npx )?prettier' 'rtk prettier' ||
  try_rewrite '^(npx[[:space:]]+)?playwright([[:space:]]|$)' '^(npx )?playwright' 'rtk playwright' ||
  try_rewrite '^pnpm[[:space:]]+playwright([[:space:]]|$)' '^pnpm playwright' 'rtk playwright' ||
  try_rewrite '^(npx[[:space:]]+)?prisma([[:space:]]|$)' '^(npx )?prisma' 'rtk prisma' ||
  # Network
  try_rewrite '^curl[[:space:]]+' '^curl ' 'rtk curl ' ||
  try_rewrite '^wget[[:space:]]+' '^wget ' 'rtk wget ' ||
  # pnpm package management
  try_rewrite '^pnpm[[:space:]]+(list|ls|outdated)([[:space:]]|$)' '^pnpm ' 'rtk pnpm ' ||
  # Python tooling
  try_rewrite '^pytest([[:space:]]|$)' '^pytest' 'rtk pytest' ||
  try_rewrite '^python[[:space:]]+-m[[:space:]]+pytest([[:space:]]|$)' '^python -m pytest' 'rtk pytest' ||
  try_rewrite '^ruff[[:space:]]+(check|format)([[:space:]]|$)' '^ruff ' 'rtk ruff ' ||
  try_rewrite '^pip[[:space:]]+(list|outdated|install|show)([[:space:]]|$)' '^pip ' 'rtk pip ' ||
  try_rewrite '^uv[[:space:]]+pip[[:space:]]+(list|outdated|install|show)([[:space:]]|$)' '^uv pip ' 'rtk pip ' ||
  try_rewrite '^mypy([[:space:]]|$)' '^mypy' 'rtk mypy' ||
  try_rewrite '^python[[:space:]]+-m[[:space:]]+mypy([[:space:]]|$)' '^python -m mypy' 'rtk mypy' ||
  # Go tooling
  try_rewrite '^go[[:space:]]+test([[:space:]]|$)' '^go test' 'rtk go test' ||
  try_rewrite '^go[[:space:]]+build([[:space:]]|$)' '^go build' 'rtk go build' ||
  try_rewrite '^go[[:space:]]+vet([[:space:]]|$)' '^go vet' 'rtk go vet' ||
  try_rewrite '^golangci-lint([[:space:]]|$)' '^golangci-lint' 'rtk golangci-lint' ||
  true  # ensure chain always succeeds
fi

# If no rewrite needed, approve as-is
if [ -z "$REWRITTEN" ]; then
  exit 0
fi

# Build the updated tool_input with all original fields preserved, only command changed
ORIGINAL_INPUT=$(echo "$INPUT" | jq -c '.tool_input')
UPDATED_INPUT=$(echo "$ORIGINAL_INPUT" | jq --arg cmd "$REWRITTEN" '.command = $cmd')

# Output the rewrite instruction
jq -n \
  --argjson updated "$UPDATED_INPUT" \
  '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "permissionDecisionReason": "RTK auto-rewrite",
      "updatedInput": $updated
    }
  }'
