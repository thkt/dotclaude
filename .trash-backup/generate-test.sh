#!/bin/bash
# Test File Generator Script
# Usage: generate-test.sh <source-file> [--vitest|--jest] [--force|-f]
#
# Generates test file scaffold from source file using AAA pattern
#
# Options:
#   --vitest    Use Vitest framework
#   --jest      Use Jest framework
#   --force, -f Overwrite existing test file without prompting
#
# Limitations:
#   Function extraction supports these patterns:
#     - export function name()
#     - export const name = ...
#     - function name()
#
#   NOT supported (will need manual import):
#     - export const fn = () => {}  (arrow functions)
#     - export default function()   (default exports)
#     - const fn: Type = () => {}   (TypeScript type annotations on arrow)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
SOURCE_FILE=""
FRAMEWORK="--auto"
FORCE_OVERWRITE=false

for arg in "$@"; do
  case "$arg" in
    --force|-f)
      FORCE_OVERWRITE=true
      ;;
    --vitest|--jest)
      FRAMEWORK="$arg"
      ;;
    *)
      if [ -z "$SOURCE_FILE" ]; then
        SOURCE_FILE="$arg"
      fi
      ;;
  esac
done

# Argument check
if [ -z "$SOURCE_FILE" ]; then
  echo "Usage: generate-test.sh <source-file> [--vitest|--jest] [--force|-f]"
  echo ""
  echo "Options:"
  echo "  --vitest    Use Vitest framework"
  echo "  --jest      Use Jest framework"
  echo "  --force, -f Overwrite existing test file without prompting"
  echo ""
  echo "Examples:"
  echo "  generate-test.sh src/utils/calculator.ts"
  echo "  generate-test.sh src/hooks/useAuth.ts --vitest"
  echo "  generate-test.sh src/hooks/useAuth.ts --force"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📝 Test File Generator${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check source file exists
if [ ! -f "$SOURCE_FILE" ]; then
  echo -e "${RED}❌ Source file not found: ${SOURCE_FILE}${NC}"
  exit 1
fi

# Auto-detect framework
detect_framework() {
  if [ "$FRAMEWORK" != "--auto" ]; then
    echo "${FRAMEWORK#--}"
    return
  fi

  if [ -f "package.json" ]; then
    if grep -q '"vitest"' package.json 2>/dev/null; then
      echo "vitest"
    elif grep -q '"jest"' package.json 2>/dev/null; then
      echo "jest"
    else
      echo "vitest"  # Default
    fi
  else
    echo "vitest"
  fi
}

FW=$(detect_framework)

# Parse file path
DIRNAME=$(dirname "$SOURCE_FILE")
BASENAME=$(basename "$SOURCE_FILE")
EXTENSION="${BASENAME##*.}"
FILENAME="${BASENAME%.*}"

# Generate test file path
TEST_FILE="${DIRNAME}/${FILENAME}.test.${EXTENSION}"

echo -e "${GREEN}📄 Source: ${SOURCE_FILE}${NC}"
echo -e "${GREEN}📄 Test: ${TEST_FILE}${NC}"
echo -e "${GREEN}🔧 Framework: ${FW}${NC}"
echo ""

# Check existing file (H-2 fix: support --force and non-interactive mode)
if [ -f "$TEST_FILE" ]; then
  echo -e "${YELLOW}⚠️  Test file already exists: ${TEST_FILE}${NC}"

  if [ "$FORCE_OVERWRITE" = true ]; then
    echo "   Overwriting (--force specified)"
  elif [ -t 0 ]; then
    # stdin is a terminal, can prompt interactively
    read -p "Overwrite? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
      echo "Cancelled"
      exit 0
    fi
  else
    # Non-interactive mode without --force
    echo -e "${RED}   Use --force to overwrite in non-interactive mode${NC}"
    exit 1
  fi
fi

# Extract function names from source (simplified)
# Note: See script header for supported/unsupported patterns
extract_functions() {
  grep -E "^export (function|const) \w+|^function \w+" "$SOURCE_FILE" 2>/dev/null | \
    sed -E 's/^export (function|const) ([a-zA-Z0-9_]+).*/\2/' | \
    sed -E 's/^function ([a-zA-Z0-9_]+).*/\1/' || echo ""
}

FUNCTIONS=$(extract_functions)

# Generate Vitest template
generate_vitest_template() {
  cat << EOF
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ${FUNCTIONS:-"/* TODO: import target */"} } from './${FILENAME}'

describe('${FILENAME}', () => {
  // Setup
  beforeEach(() => {
    // Arrange: Test setup
  })

  afterEach(() => {
    // Cleanup
  })

EOF

  if [ -n "$FUNCTIONS" ]; then
    echo "$FUNCTIONS" | while read -r func; do
      [ -z "$func" ] && continue
      cat << EOF
  describe('${func}', () => {
    it('should TODO: describe expected behavior', () => {
      // Arrange
      const input = undefined // TODO: set input

      // Act
      const result = ${func}(input)

      // Assert
      expect(result).toBeDefined() // TODO: add proper assertions
    })

    it('should handle edge cases', () => {
      // TODO: add edge case tests
    })
  })

EOF
    done
  else
    cat << EOF
  it('should TODO: describe expected behavior', () => {
    // Arrange
    // TODO: setup test data

    // Act
    // TODO: call function under test

    // Assert
    // TODO: add assertions
  })

EOF
  fi

  echo "})"
}

# Generate Jest template
generate_jest_template() {
  cat << EOF
import { ${FUNCTIONS:-"/* TODO: import target */"} } from './${FILENAME}'

describe('${FILENAME}', () => {
  // Setup
  beforeEach(() => {
    // Arrange: Test setup
  })

  afterEach(() => {
    // Cleanup
  })

EOF

  if [ -n "$FUNCTIONS" ]; then
    echo "$FUNCTIONS" | while read -r func; do
      [ -z "$func" ] && continue
      cat << EOF
  describe('${func}', () => {
    it('should TODO: describe expected behavior', () => {
      // Arrange
      const input = undefined // TODO: set input

      // Act
      const result = ${func}(input)

      // Assert
      expect(result).toBeDefined() // TODO: add proper assertions
    })

    it('should handle edge cases', () => {
      // TODO: add edge case tests
    })
  })

EOF
    done
  else
    cat << EOF
  it('should TODO: describe expected behavior', () => {
    // Arrange
    // TODO: setup test data

    // Act
    // TODO: call function under test

    // Assert
    // TODO: add assertions
  })

EOF
  fi

  echo "})"
}

# Generate test file
echo -e "${BLUE}▶ Generating test file...${NC}"

case "$FW" in
  "vitest")
    generate_vitest_template > "$TEST_FILE"
    ;;
  "jest")
    generate_jest_template > "$TEST_FILE"
    ;;
  *)
    generate_vitest_template > "$TEST_FILE"
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Test file generated${NC}"
echo ""
echo "Generated: ${TEST_FILE}"
echo ""
echo "Next steps:"
echo "  1. Replace TODO comments with actual test logic"
echo "  2. Follow AAA pattern (Arrange-Act-Assert)"
echo "  3. Run Red-Green-Refactor cycle"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Show detected functions
if [ -n "$FUNCTIONS" ]; then
  echo ""
  echo -e "${BLUE}📋 Detected functions:${NC}"
  echo "$FUNCTIONS" | while read -r func; do
    [ -n "$func" ] && echo "  - ${func}"
  done
else
  echo ""
  echo -e "${YELLOW}💡 Note: No exportable functions detected${NC}"
  echo "   Supported patterns: export function name(), export const name"
  echo "   See script header for full list of limitations"
fi
