#!/bin/bash
# Skill Validation Template
# Usage: ./validate-template.sh <skill-directory>

SKILL_DIR="$1"

if [ -z "$SKILL_DIR" ]; then
  echo "Usage: $0 <skill-directory>"
  exit 1
fi

echo "=== Validating $SKILL_DIR ==="

# Check required files
check_required_files() {
  local missing=0
  for file in SKILL.md; do
    if [ ! -f "$SKILL_DIR/$file" ]; then
      echo "❌ Missing: $file"
      missing=1
    else
      echo "✓ Found: $file"
    fi
  done
  return $missing
}

# Check YAML frontmatter
check_frontmatter() {
  local skill_md="$SKILL_DIR/SKILL.md"

  # Check name field
  if ! grep -q "^name:" "$skill_md"; then
    echo "❌ Missing 'name' field in frontmatter"
    return 1
  fi

  # Check description field
  if ! grep -q "^description:" "$skill_md"; then
    echo "❌ Missing 'description' field in frontmatter"
    return 1
  fi

  echo "✓ Frontmatter valid (name, description present)"
  return 0
}

# Check line count (<500 recommended)
check_line_count() {
  local lines=$(wc -l < "$SKILL_DIR/SKILL.md")
  if [ "$lines" -gt 500 ]; then
    echo "⚠️ SKILL.md exceeds 500 lines ($lines lines) - consider splitting"
    return 1
  fi
  echo "✓ Line count OK ($lines lines)"
  return 0
}

# Check description length (<1024 chars)
check_description_length() {
  local skill_md="$SKILL_DIR/SKILL.md"

  if [ ! -f "$skill_md" ]; then
    echo "⚠️ Cannot check description: SKILL.md not found"
    return 1
  fi

  # Extract description (handle multi-line) - macOS compatible
  local desc_length=$(awk '/^description:/,/^[a-z-]*:/' "$skill_md" | grep -v "^[a-z-]*:$" | wc -c | tr -d ' ')

  if [ "$desc_length" -gt 1024 ]; then
    echo "⚠️ Description exceeds 1024 characters ($desc_length chars)"
    return 1
  fi
  echo "✓ Description length OK ($desc_length chars)"
  return 0
}

# Main validation
errors=0
critical_errors=0

check_required_files
if [ $? -ne 0 ]; then
  ((errors++))
  ((critical_errors++))
fi

check_frontmatter
if [ $? -ne 0 ]; then
  ((errors++))
  ((critical_errors++))
fi

check_line_count || ((errors++))
check_description_length || ((errors++))

echo ""
if [ $critical_errors -gt 0 ]; then
  echo "=== ❌ Validation Failed ($critical_errors critical error(s)) ==="
  exit 1
elif [ $errors -eq 0 ]; then
  echo "=== ✅ Validation Passed ==="
  exit 0
else
  echo "=== ⚠️ Validation completed with $errors warning(s) ==="
  exit 0  # Warnings don't fail the validation
fi
