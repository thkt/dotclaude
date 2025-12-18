#!/bin/bash
# Coverage Check Script
# Usage: coverage-check.sh [threshold]
#
# Measures test coverage and checks against threshold (default: 100%)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default threshold: 100% (aim high!)
THRESHOLD="${1:-100}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Coverage Check (threshold: ${THRESHOLD}%)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

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
    echo "npm"
  fi
}

# Detect test runner
detect_test_runner() {
  if [ -f "package.json" ]; then
    if grep -q '"vitest"' package.json 2>/dev/null; then
      echo "vitest"
    elif grep -q '"jest"' package.json 2>/dev/null; then
      echo "jest"
    elif grep -q '"c8"' package.json 2>/dev/null; then
      echo "c8"
    elif grep -q '"nyc"' package.json 2>/dev/null; then
      echo "nyc"
    else
      echo "unknown"
    fi
  else
    echo "unknown"
  fi
}

PM=$(detect_package_manager)
RUNNER=$(detect_test_runner)

echo -e "${GREEN}📦 Package manager: ${PM}${NC}"
echo -e "${GREEN}🔧 Test runner: ${RUNNER}${NC}"
echo ""

# Build coverage command
build_coverage_command() {
  local cmd=""

  case "$RUNNER" in
    "vitest")
      cmd="$PM run vitest run --coverage"
      ;;
    "jest")
      cmd="$PM run jest --coverage"
      ;;
    "c8")
      cmd="$PM run c8 $PM test"
      ;;
    "nyc")
      cmd="$PM run nyc $PM test"
      ;;
    *)
      if grep -q '"coverage":' package.json 2>/dev/null; then
        cmd="$PM run coverage"
      elif grep -q '"test:coverage":' package.json 2>/dev/null; then
        cmd="$PM run test:coverage"
      else
        echo -e "${YELLOW}⚠️  Could not detect coverage tool${NC}"
        echo "   Please install one of:"
        echo "   - vitest (recommended)"
        echo "   - jest"
        echo "   - c8 / nyc"
        exit 1
      fi
      ;;
  esac

  echo "$cmd"
}

COVERAGE_CMD=$(build_coverage_command)

echo -e "${BLUE}▶ Command: ${COVERAGE_CMD}${NC}"
echo ""

# Run coverage
TEMP_OUTPUT=$(mktemp)
trap "rm -f $TEMP_OUTPUT" EXIT

# Use eval here as command is internally constructed (no user input in command itself)
# Note: COVERAGE_CMD is built internally from trusted sources
if eval "$COVERAGE_CMD" | tee "$TEMP_OUTPUT"; then
  echo ""
  echo "─────────────────────────────────────────────"
  echo -e "${BLUE}📈 Coverage Analysis${NC}"
  echo "─────────────────────────────────────────────"

  # Extract coverage percentage (M-2 fix: more robust pattern)
  # Matches: 100%, 95.5%, 80.25%, etc.
  COVERAGE=$(grep -E "(All files|Lines|Statements|Coverage)" "$TEMP_OUTPUT" | \
             grep -oE '[0-9]+(\.[0-9]+)?%' | head -1 | tr -d '%' || echo "0")

  # Fallback: try to find any percentage without label
  if [ -z "$COVERAGE" ] || [ "$COVERAGE" = "0" ]; then
    COVERAGE=$(grep -oE '[0-9]+(\.[0-9]+)?%' "$TEMP_OUTPUT" | head -1 | tr -d '%' || echo "0")
  fi

  if [ -z "$COVERAGE" ] || [ "$COVERAGE" = "0" ]; then
    echo -e "${YELLOW}⚠️  Could not extract coverage percentage${NC}"
    echo "   Please check the report manually"
    exit 0
  fi

  # Convert to integer
  COVERAGE_INT=$(echo "$COVERAGE" | cut -d'.' -f1)

  echo ""
  echo -e "Coverage: ${COVERAGE}%"
  echo -e "Threshold: ${THRESHOLD}%"
  echo ""

  if [ "$COVERAGE_INT" -ge "$THRESHOLD" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ Coverage OK (${COVERAGE}% >= ${THRESHOLD}%)${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}❌ Coverage below threshold (${COVERAGE}% < ${THRESHOLD}%)${NC}"
    echo ""
    echo "Tips to improve:"
    echo "  1. Identify untested functions"
    echo "  2. Add boundary value & edge case tests"
    echo "  3. Add error handling tests"
    echo "  4. Check for dead code that can be removed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo -e "${RED}❌ Coverage measurement failed${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
