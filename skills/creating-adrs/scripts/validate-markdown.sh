#!/bin/bash
# Markdown Lint Validation Script
# Usage: validate-markdown.sh <markdown-file-or-directory>
# Exit codes: 0 = success (including warnings), 1 = critical error

set -euo pipefail

# Arguments
TARGET="${1:-.}"

# Color definitions (matching validate-adr.sh pattern)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if markdownlint-cli2 is installed
if ! command -v markdownlint-cli2 &> /dev/null; then
  echo -e "${BLUE}ℹ️  Markdown lint skipped (markdownlint-cli2 not installed)${NC}"
  echo -e "${BLUE}   Install: npm install -g markdownlint-cli2${NC}"
  exit 0
fi

# Check if target exists
if [ ! -e "$TARGET" ]; then
  echo -e "${RED}❌ Error: Target not found: $TARGET${NC}"
  exit 1
fi

# Config file discovery chain:
# 1. $MARKDOWNLINT_CONFIG (explicit override)
# 2. $PWD/.markdownlint.json (project-local)
# 3. ~/.claude/.markdownlint.json (global default)
# 4. No config (markdownlint defaults)
CONFIG_FILE=""
CONFIG_SOURCE=""

if [ -n "${MARKDOWNLINT_CONFIG:-}" ] && [ -f "$MARKDOWNLINT_CONFIG" ]; then
  CONFIG_FILE="$MARKDOWNLINT_CONFIG"
  CONFIG_SOURCE="env"
elif [ -f ".markdownlint.json" ]; then
  CONFIG_FILE=".markdownlint.json"
  CONFIG_SOURCE="project"
elif [ -f "$HOME/.claude/.markdownlint.json" ]; then
  CONFIG_FILE="$HOME/.claude/.markdownlint.json"
  CONFIG_SOURCE="global"
fi

# Build command
CMD="markdownlint-cli2"
if [ -n "$CONFIG_FILE" ]; then
  CMD="$CMD --config \"$CONFIG_FILE\""
fi
CMD="$CMD \"$TARGET\""

# Run lint
if [ -n "$CONFIG_SOURCE" ]; then
  echo -e "${BLUE}📝 Running Markdown lint (config: $CONFIG_SOURCE)...${NC}"
else
  echo -e "${BLUE}📝 Running Markdown lint (default config)...${NC}"
fi

# Execute and capture result
if eval "$CMD" 2>&1; then
  echo -e "${GREEN}✅ Markdown lint: OK${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Markdown lint: Issues found (see above)${NC}"
  exit 0  # Non-blocking - warnings only
fi
