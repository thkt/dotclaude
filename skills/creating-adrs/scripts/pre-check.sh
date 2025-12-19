#!/bin/bash
# ADR Pre-creation Check Script
# Usage: pre-check.sh "ADR Title"

set -euo pipefail

TITLE="$1"
ADR_DIR="${ADR_DIR:-docs/adr}"
THRESHOLD="${DUPLICATE_THRESHOLD:-0.7}"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ADR Pre-creation Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Title validation
echo "📋 1. Title Validation"
TITLE_LENGTH=${#TITLE}
if [ $TITLE_LENGTH -lt 5 ] || [ $TITLE_LENGTH -gt 64 ]; then
  echo -e "${RED}❌ Title length error: ${TITLE_LENGTH} characters (recommended: 5-64 characters)${NC}"
  exit 1
fi

# Forbidden characters check
FORBIDDEN_CHARS='[/:*?"<>|]'
if [[ "$TITLE" =~ $FORBIDDEN_CHARS ]]; then
  echo -e "${RED}❌ Contains forbidden characters: / : * ? \" < > |${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Title length: ${TITLE_LENGTH} characters${NC}"
echo -e "${GREEN}✅ Character set: OK${NC}"
echo ""

# 2. Directory validation
echo "📁 2. Directory Validation"
if [ ! -d "$ADR_DIR" ]; then
  echo -e "${YELLOW}⚠️  Directory not found: $ADR_DIR${NC}"
  echo "   Attempting to create automatically..."
  mkdir -p "$ADR_DIR"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Directory created successfully${NC}"
  else
    echo -e "${RED}❌ Directory creation failed${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✅ Directory exists: $ADR_DIR${NC}"
fi

# Write permission check
if [ ! -w "$ADR_DIR" ]; then
  echo -e "${RED}❌ No write permission: $ADR_DIR${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Write permission: OK${NC}"
echo ""

# 3. Numbering
echo "🔢 3. ADR Number Assignment"
LAST_NUM=$(ls "$ADR_DIR" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1 | cut -d'-' -f1 || echo "0000")
NEXT_NUM=$(printf "%04d" $((10#$LAST_NUM + 1)))
echo -e "${GREEN}✅ Next number: ${NEXT_NUM}${NC}"

# Slug generation
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
FILENAME="${NEXT_NUM}-${SLUG}.md"
echo -e "${GREEN}✅ Filename: ${FILENAME}${NC}"
echo ""

# 4. Duplicate check (simple: title string similarity)
echo "🔍 4. Duplicate Check"
if [ -d "$ADR_DIR" ] && [ "$(ls -A $ADR_DIR 2>/dev/null)" ]; then
  SIMILAR_FOUND=false
  while IFS= read -r existing_file; do
    # Extract title (first # line)
    EXISTING_TITLE=$(grep -m 1 '^# ' "$existing_file" | sed 's/^# //')

    # Simple similarity check (common word count)
    COMMON_WORDS=$(comm -12 \
      <(echo "$TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      <(echo "$EXISTING_TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      | wc -l)

    TITLE_WORDS=$(echo "$TITLE" | tr ' ' '\n' | wc -l)

    if [ $TITLE_WORDS -gt 0 ]; then
      SIMILARITY=$(awk "BEGIN {printf \"%.2f\", $COMMON_WORDS / $TITLE_WORDS}")

      if (( $(awk "BEGIN {print ($SIMILARITY >= $THRESHOLD)}") )); then
        echo -e "${YELLOW}⚠️  Similar ADR detected (similarity: ${SIMILARITY}): $(basename $existing_file)${NC}"
        echo "   Existing: $EXISTING_TITLE"
        SIMILAR_FOUND=true
      fi
    fi
  done < <(find "$ADR_DIR" -name "*.md" -type f)

  if [ "$SIMILAR_FOUND" = false ]; then
    echo -e "${GREEN}✅ No similar ADRs found${NC}"
  else
    echo ""
    echo -e "${YELLOW}💡 Please check relevance. Consider updating existing ADR if needed.${NC}"
  fi
else
  echo -e "${GREEN}✅ No existing ADRs (first creation)${NC}"
fi
echo ""

# 5. Date validation
echo "📅 5. Date Validation"
CURRENT_DATE=$(date +%Y-%m-%d)
echo -e "${GREEN}✅ Creation date: ${CURRENT_DATE}${NC}"
echo ""

# 6. Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Ready to create${NC}"
echo ""
echo "Will create with the following information:"
echo "  Number: ${NEXT_NUM}"
echo "  Filename: ${FILENAME}"
echo "  Creation date: ${CURRENT_DATE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Output result as JSON (for Claude Code parsing)
cat <<EOF

{
  "status": "ok",
  "number": "${NEXT_NUM}",
  "filename": "${FILENAME}",
  "slug": "${SLUG}",
  "date": "${CURRENT_DATE}",
  "warnings": []
}
EOF

exit 0
