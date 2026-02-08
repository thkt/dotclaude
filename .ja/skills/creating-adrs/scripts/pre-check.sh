#!/bin/zsh
# 使用法: pre-check.sh "ADR Title"

set -e

TITLE="$1"
ADR_DIR="${ADR_DIR:-docs/adr}"
THRESHOLD="${DUPLICATE_THRESHOLD:-0.7}"

source "$(dirname "$0")/colors.sh"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ADR Pre-creation Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 1. Title Validation"
TITLE_LENGTH=${#TITLE}
if [ $TITLE_LENGTH -lt 5 ] || [ $TITLE_LENGTH -gt 64 ]; then
  echo "${RED}❌ Title length error: ${TITLE_LENGTH} characters (recommended: 5-64 characters)${NC}"
  exit 1
fi

FORBIDDEN_CHARS='[/:*?"<>|]'
if [[ "$TITLE" =~ $FORBIDDEN_CHARS ]]; then
  echo "${RED}❌ Contains forbidden characters: / : * ? \" < > |${NC}"
  exit 1
fi

echo "${GREEN}✅ Title length: ${TITLE_LENGTH} characters${NC}"
echo "${GREEN}✅ Character set: OK${NC}"
echo ""

echo "📁 2. Directory Validation"
if [ ! -d "$ADR_DIR" ]; then
  echo "${YELLOW}⚠️  Directory not found: $ADR_DIR${NC}"
  echo "   Attempting to create automatically..."
  if mkdir -p "$ADR_DIR"; then
    echo "${GREEN}✅ Directory created successfully${NC}"
  else
    echo "${RED}❌ Directory creation failed${NC}"
    exit 1
  fi
else
  echo "${GREEN}✅ Directory exists: $ADR_DIR${NC}"
fi

if [ ! -w "$ADR_DIR" ]; then
  echo "${RED}❌ No write permission: $ADR_DIR${NC}"
  exit 1
fi
echo "${GREEN}✅ Write permission: OK${NC}"
echo ""

echo "🔢 3. ADR Number Assignment"
SCRIPTS_DIR="${HOME}/.claude/scripts"
NEXT_NUM=$("$SCRIPTS_DIR/next-adr-number.sh" "$ADR_DIR")
echo "${GREEN}✅ Next number: ${NEXT_NUM}${NC}"

SLUG=$("$SCRIPTS_DIR/slugify.sh" "$TITLE")
FILENAME="${NEXT_NUM}-${SLUG}.md"
echo "${GREEN}✅ Filename: ${FILENAME}${NC}"
echo ""

echo "🔍 4. Duplicate Check"
if [ -d "$ADR_DIR" ] && [ "$(ls -A "$ADR_DIR" 2>/dev/null)" ]; then
  SIMILAR_FOUND=false
  while IFS= read -r existing_file; do
    EXISTING_TITLE=$(grep -m 1 '^# ' "$existing_file" | sed 's/^# //')

    COMMON_WORDS=$(comm -12 \
      <(echo "$TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      <(echo "$EXISTING_TITLE" | tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort) \
      | wc -l)

    TITLE_WORDS=$(echo "$TITLE" | tr ' ' '\n' | wc -l)

    if [ $TITLE_WORDS -gt 0 ]; then
      SIMILARITY=$(awk -v cw="$COMMON_WORDS" -v tw="$TITLE_WORDS" 'BEGIN {printf "%.2f", cw/tw}')

      if (( $(awk -v s="$SIMILARITY" -v t="$THRESHOLD" 'BEGIN {print (s >= t)}') )); then
        echo "${YELLOW}⚠️  Similar ADR detected (similarity: ${SIMILARITY}): $(basename "$existing_file")${NC}"
        echo "   Existing: $EXISTING_TITLE"
        SIMILAR_FOUND=true
      fi
    fi
  done < <(find "$ADR_DIR" -name "*.md" -type f)

  if [ "$SIMILAR_FOUND" = false ]; then
    echo "${GREEN}✅ No similar ADRs found${NC}"
  else
    echo ""
    echo "${YELLOW}💡 Please check relevance. Consider updating existing ADR if needed.${NC}"
  fi
else
  echo "${GREEN}✅ No existing ADRs (first creation)${NC}"
fi
echo ""

echo "📅 5. Date Validation"
CURRENT_DATE=$(date +%Y-%m-%d)
echo "${GREEN}✅ Creation date: ${CURRENT_DATE}${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${GREEN}✅ Ready to create${NC}"
echo ""
echo "Will create with the following information:"
echo "  Number: ${NEXT_NUM}"
echo "  Filename: ${FILENAME}"
echo "  Creation date: ${CURRENT_DATE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# JSON出力（Claude Code パーサー用）
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
