#!/bin/bash
# Validate All Skills
# Usage: ./validate-all.sh

SKILLS_DIR="$HOME/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Validating All Skills ==="
echo ""

# Find all skill directories (those containing SKILL.md)
skills=$(find "$SKILLS_DIR" -maxdepth 2 -name "SKILL.md" -exec dirname {} \;)

total=0
passed=0
warned=0

for skill_dir in $skills; do
  skill_name=$(basename "$skill_dir")
  echo "--- $skill_name ---"

  if bash "$SCRIPT_DIR/validate-template.sh" "$skill_dir"; then
    ((passed++))
  else
    ((warned++))
  fi

  ((total++))
  echo ""
done

echo "=== Summary ==="
echo "Total skills: $total"
echo "Passed: $passed"
echo "Warnings: $warned"

if [ $warned -gt 0 ]; then
  echo ""
  echo "Some skills have warnings. Run individual validation for details."
fi
