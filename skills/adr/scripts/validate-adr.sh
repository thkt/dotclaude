#!/bin/zsh
# Usage: validate-adr.sh <adr-file>
# Output (stdout): JSON { errors, warnings, checks }
# Exit: 0 if no errors (warnings allowed), 1 if errors

set -euo pipefail

ADR_FILE="${1:-}"

if [ ! -f "$ADR_FILE" ]; then
  echo "Error: file not found: $ADR_FILE" >&2
  exit 1
fi

ERRORS=()
WARNINGS=()
CHECKS=()

for section in "Context and Problem Statement" "Considered Options" "Decision Outcome"; do
  if grep -q "## $section" "$ADR_FILE"; then
    CHECKS+=("section:$section=ok")
  else
    ERRORS+=("missing_section:$section")
  fi
done

for meta in "Status" "Date"; do
  if grep -q "^- $meta:" "$ADR_FILE"; then
    VALUE=$(grep -m 1 "^- $meta:" "$ADR_FILE" || true)
    CHECKS+=("metadata:$meta=ok [$VALUE]")
  else
    ERRORS+=("missing_metadata:$meta")
  fi
done

if grep -q "^- Confidence:" "$ADR_FILE"; then
  VALUE=$(grep -m 1 "^- Confidence:" "$ADR_FILE" || true)
  CHECKS+=("metadata:Confidence=ok [$VALUE]")
else
  WARNINGS+=("missing_metadata:Confidence (recommended: high|medium|low)")
fi

OPTIONS_COUNT=$(grep -c "^### " "$ADR_FILE" || true)
OPTIONS_COUNT=${OPTIONS_COUNT:-0}
if [ "$OPTIONS_COUNT" -ge 2 ]; then
  CHECKS+=("options_count=${OPTIONS_COUNT}")
elif [ "$OPTIONS_COUNT" -eq 1 ]; then
  WARNINGS+=("options_count=1 (recommended: 2+)")
else
  ERRORS+=("options_count=0")
fi

REFERENCES_COUNT=$(grep -c "^\[.*\](.*)$" "$ADR_FILE" || true)
REFERENCES_COUNT=${REFERENCES_COUNT:-0}
if [ "$REFERENCES_COUNT" -ge 3 ]; then
  CHECKS+=("references_count=${REFERENCES_COUNT}")
elif [ "$REFERENCES_COUNT" -gt 0 ]; then
  WARNINGS+=("references_count=${REFERENCES_COUNT} (recommended: 3+)")
else
  WARNINGS+=("references_count=0 (recommended: 3+)")
fi

if grep -q "^# " "$ADR_FILE"; then
  CHECKS+=("title_heading=ok")
else
  ERRORS+=("title_heading=missing")
fi

if command -v markdownlint-cli2 &> /dev/null; then
  LINT_CONFIG=""
  if [ -n "${MARKDOWNLINT_CONFIG:-}" ] && [ -f "$MARKDOWNLINT_CONFIG" ]; then
    LINT_CONFIG="$MARKDOWNLINT_CONFIG"
  elif [ -f ".markdownlint.json" ]; then
    LINT_CONFIG=".markdownlint.json"
  elif [ -f "$HOME/.claude/.markdownlint.json" ]; then
    LINT_CONFIG="$HOME/.claude/.markdownlint.json"
  fi

  lint_args=(markdownlint-cli2)
  if [ -n "$LINT_CONFIG" ]; then
    lint_args+=(--config "$LINT_CONFIG")
  fi
  lint_args+=("$ADR_FILE")

  if "${lint_args[@]}" > /dev/null 2>&1; then
    CHECKS+=("markdown_lint=ok")
  else
    WARNINGS+=("markdown_lint=issues (run markdownlint-cli2 for details)")
  fi
else
  CHECKS+=("markdown_lint=skipped (markdownlint-cli2 not installed)")
fi

# JSON output
join_array() {
  local arr=()
  for item in "$@"; do
    [ -n "$item" ] && arr+=("$item")
  done
  if [ "${#arr[@]}" -eq 0 ]; then
    echo "[]"
    return
  fi
  local out=""
  for item in "${arr[@]}"; do
    local escaped=${item//\\/\\\\}
    escaped=${escaped//\"/\\\"}
    out+="\"${escaped}\","
  done
  echo "[${out%,}]"
}

ERRORS_JSON=$(join_array "${ERRORS[@]:-}")
WARNINGS_JSON=$(join_array "${WARNINGS[@]:-}")
CHECKS_JSON=$(join_array "${CHECKS[@]:-}")

cat <<EOF
{
  "file": "$(basename "$ADR_FILE")",
  "errors": ${ERRORS_JSON},
  "warnings": ${WARNINGS_JSON},
  "checks": ${CHECKS_JSON}
}
EOF

if [ "${#ERRORS[@]}" -gt 0 ]; then
  exit 1
fi
exit 0
