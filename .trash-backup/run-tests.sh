#!/bin/bash
# TDD Test Runner Script
# Usage: run-tests.sh [test-pattern] [--watch]
#
# Auto-detects package manager and test runner, then executes tests

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Arguments
TEST_PATTERN="${1:-}"
WATCH_MODE="${2:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🧪 TDD Test Runner${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check for package.json (M-3 fix)
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found in current directory${NC}"
  echo "   Please run this script from your project root."
  exit 1
fi

# Detect package manager
detect_package_manager() {
  if [ -f "bun.lockb" ]; then
    echo "bun"
  elif [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "package-lock.json" ]; then
    echo "npm"
  else
    echo "npm"  # Default
  fi
}

# Detect test runner
detect_test_runner() {
  if grep -q '"vitest"' package.json 2>/dev/null; then
    echo "vitest"
  elif grep -q '"jest"' package.json 2>/dev/null; then
    echo "jest"
  elif grep -q '"mocha"' package.json 2>/dev/null; then
    echo "mocha"
  elif grep -q '"ava"' package.json 2>/dev/null; then
    echo "ava"
  elif grep -q '"test":' package.json 2>/dev/null; then
    echo "script"
  else
    echo "unknown"
  fi
}

PM=$(detect_package_manager)
RUNNER=$(detect_test_runner)

echo -e "${GREEN}📦 Package manager: ${PM}${NC}"
echo -e "${GREEN}🔧 Test runner: ${RUNNER}${NC}"
echo ""

# Build test command as array (H-1 fix: avoid eval)
build_test_command() {
  local -n cmd_array=$1

  case "$RUNNER" in
    "vitest")
      cmd_array=("$PM" "run" "vitest")
      [ -n "$TEST_PATTERN" ] && cmd_array+=("$TEST_PATTERN")
      [ "$WATCH_MODE" = "--watch" ] && cmd_array+=("--watch")
      ;;
    "jest")
      cmd_array=("$PM" "run" "jest")
      [ -n "$TEST_PATTERN" ] && cmd_array+=("$TEST_PATTERN")
      [ "$WATCH_MODE" = "--watch" ] && cmd_array+=("--watch")
      ;;
    "mocha")
      cmd_array=("$PM" "run" "mocha")
      [ -n "$TEST_PATTERN" ] && cmd_array+=("--grep" "$TEST_PATTERN")
      [ "$WATCH_MODE" = "--watch" ] && cmd_array+=("--watch")
      ;;
    "script")
      cmd_array=("$PM" "test")
      [ -n "$TEST_PATTERN" ] && cmd_array+=("--" "$TEST_PATTERN")
      ;;
    *)
      echo -e "${YELLOW}⚠️  Could not detect test runner${NC}"
      echo "   Running 'test' script from package.json"
      cmd_array=("$PM" "test")
      ;;
  esac
}

# Build command array
declare -a TEST_CMD
build_test_command TEST_CMD

# Display command for user
echo -e "${BLUE}▶ Command: ${TEST_CMD[*]}${NC}"
echo ""

# Run tests using array expansion (safe, no eval)
START_TIME=$(date +%s)

if "${TEST_CMD[@]}"; then
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${GREEN}✅ Tests passed (${DURATION}s)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${RED}❌ Tests failed (${DURATION}s)${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
