#!/bin/zsh
# Performance Optimization Skill Validation
# Usage: ./validate.sh [skill-directory]

SKILL_DIR="${1:-$(dirname "$0")/..}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Performance Optimization Skill Validation ==="
echo ""

# Run base validation
bash "$SCRIPT_DIR/validate-template.sh" "$SKILL_DIR"
base_result=$?

# Additional checks for performance-optimization
echo ""
echo "--- Additional Checks ---"

# Check references exist
check_references() {
  local refs=("references/web-vitals.md" "references/react-optimization.md" "references/bundle-optimization.md")
  local missing=0

  for ref in "${refs[@]}"; do
    if [ ! -f "$SKILL_DIR/$ref" ]; then
      echo "❌ Missing reference: $ref"
      missing=1
    else
      echo "✓ Found reference: $ref"
    fi
  done

  return $missing
}

# Check EVALUATIONS.md exists
check_evaluations() {
  if [ -f "$SKILL_DIR/EVALUATIONS.md" ]; then
    echo "✓ EVALUATIONS.md exists"
    return 0
  else
    echo "⚠️ EVALUATIONS.md not found (recommended)"
    return 1
  fi
}

# Check workflow checklist exists
check_workflow() {
  if grep -q "## .*Workflow" "$SKILL_DIR/SKILL.md"; then
    echo "✓ Workflow section exists"
    return 0
  else
    echo "⚠️ Workflow section not found (recommended)"
    return 1
  fi
}

errors=0

check_references || ((errors++))
check_evaluations || ((errors++))
check_workflow || ((errors++))

echo ""
if [ $errors -eq 0 ]; then
  echo "=== ✅ All Checks Passed ==="
  exit 0
else
  echo "=== ⚠️ Completed with $errors warning(s) ==="
  exit 0
fi
