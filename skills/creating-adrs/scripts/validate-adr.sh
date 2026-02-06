#!/bin/bash
# ADR Validation Script
# Usage: validate-adr.sh <adr-file>

set -e

ADR_FILE="$1"

if [ ! -f "$ADR_FILE" ]; then
  echo "❌ Error: File not found: $ADR_FILE"
  exit 1
fi

# Color definitions
source "$(dirname "$0")/colors.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ADR Validation Report: $(basename $ADR_FILE)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

WARNINGS=0
ERRORS=0

# 1. Required sections check
echo "📋 1. Required Sections Validation"
REQUIRED_SECTIONS=(
  "Context and Problem Statement"
  "Considered Options"
  "Decision Outcome"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
  if grep -q "## $section" "$ADR_FILE"; then
    echo -e "${GREEN}✅ $section${NC}"
  else
    echo -e "${RED}❌ $section - Not filled${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# 2. Metadata validation
echo "📌 2. Metadata Validation"
REQUIRED_META=(
  "Status:"
  "Date:"
)

for meta in "${REQUIRED_META[@]}"; do
  if grep -q "^- $meta" "$ADR_FILE"; then
    VALUE=$(grep "^- $meta" "$ADR_FILE" | head -1)
    echo -e "${GREEN}✅ $VALUE${NC}"
  else
    echo -e "${RED}❌ $meta - Not set${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# 3. Content quality check
echo "📝 3. Content Quality"

# Count of Considered Options
OPTIONS_COUNT=$(grep -c "^### " "$ADR_FILE" || echo 0)
if [ $OPTIONS_COUNT -ge 2 ]; then
  echo -e "${GREEN}✅ Considered options: ${OPTIONS_COUNT}${NC}"
elif [ $OPTIONS_COUNT -eq 1 ]; then
  echo -e "${YELLOW}⚠️  Considered options: Only 1 (recommended: 2 or more)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${RED}❌ Considered options: None${NC}"
  ((ERRORS++))
fi

# Empty sections check
EMPTY_SECTIONS=$(grep -A 1 "^## " "$ADR_FILE" | grep -c "^$" || echo 0)
if [ $EMPTY_SECTIONS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  ${EMPTY_SECTIONS} empty section(s) found${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# Reference count
REFERENCES_COUNT=$(grep -c "^\[.*\](.*)$" "$ADR_FILE" || echo 0)
if [ $REFERENCES_COUNT -ge 3 ]; then
  echo -e "${GREEN}✅ References: ${REFERENCES_COUNT}${NC}"
elif [ $REFERENCES_COUNT -gt 0 ]; then
  echo -e "${YELLOW}⚠️  References: ${REFERENCES_COUNT} (recommended: 3 or more)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${YELLOW}⚠️  References: None${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 4. MADR format compliance check
echo "📐 4. MADR Format Compliance"
MADR_COMPLIANT=true

# Title format (starts with #)
if grep -q "^# " "$ADR_FILE"; then
  echo -e "${GREEN}✅ Title format: OK${NC}"
else
  echo -e "${RED}❌ Title format: NG (requires heading starting with #)${NC}"
  MADR_COMPLIANT=false
  ((ERRORS++))
fi

# Metadata in list format
if grep -q "^- Status:" "$ADR_FILE" && grep -q "^- Date:" "$ADR_FILE"; then
  echo -e "${GREEN}✅ Metadata format: OK${NC}"
else
  echo -e "${YELLOW}⚠️  Metadata format: Non-standard${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Checklist progress (if exists)
echo "☑️  5. Checklist Progress"

CHECKLIST_DIR="$(dirname $0)/../checklists"
if [ -d "$CHECKLIST_DIR" ]; then
  # Impact analysis
  if [ -f "$CHECKLIST_DIR/impact-analysis.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/impact-analysis.md" || echo 0)
    echo "  Impact analysis: 0/$TOTAL completed (action required)"
  fi

  # Test coverage
  if [ -f "$CHECKLIST_DIR/test-coverage.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/test-coverage.md" || echo 0)
    echo "  Test updates: 0/$TOTAL completed (action required)"
  fi

  # Rollback plan
  if [ -f "$CHECKLIST_DIR/rollback-plan.md" ]; then
    TOTAL=$(grep -c "^- \[ \]" "$CHECKLIST_DIR/rollback-plan.md" || echo 0)
    echo "  Rollback plan: 0/$TOTAL completed (action required)"
  fi
else
  echo -e "${BLUE}ℹ️  Checklist templates not configured${NC}"
fi
echo ""

# 6. Markdown Lint Check
echo "📝 6. Markdown Lint Check"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "${SCRIPT_DIR}/validate-markdown.sh" ]; then
  # Run lint and capture output
  LINT_OUTPUT=$(bash "${SCRIPT_DIR}/validate-markdown.sh" "$ADR_FILE" 2>&1) || true

  # Display output (filter empty lines)
  echo "$LINT_OUTPUT" | grep -v "^$" || true

  # Check if there were warnings (look for warning indicator)
  if echo "$LINT_OUTPUT" | grep -q "⚠️"; then
    WARNINGS=$((WARNINGS + 1)) || true
  fi
else
  echo -e "${BLUE}ℹ️  Markdown lint skipped (shared script not found)${NC}"
fi
echo ""

# 7. Overall evaluation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Overall Evaluation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_ISSUES=$((ERRORS + WARNINGS))

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Validation passed - ADR meets quality standards${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Warnings found - ${WARNINGS} improvement(s) recommended${NC}"
  echo ""
  echo "Recommended actions:"
  echo "  - Add references (minimum 3)"
  echo "  - Fill in empty sections"
  echo "  - Complete checklists"
  exit 0
else
  echo -e "${RED}❌ Validation failed - ${ERRORS} error(s), ${WARNINGS} warning(s)${NC}"
  echo ""
  echo "Required actions:"
  echo "  - Fill in all required sections"
  echo "  - Set metadata"
  echo "  - Consider at least 2 options"
  exit 1
fi
