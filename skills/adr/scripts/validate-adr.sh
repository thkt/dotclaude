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

# MADR v4 frontmatter: status and date are optional but recommended
FRONTMATTER=$(awk '
  BEGIN { in_fm = 0; fm_seen = 0 }
  /^---[[:space:]]*$/ {
    if (fm_seen == 0) { in_fm = 1; fm_seen = 1; next }
    else if (in_fm) { in_fm = 0; next }
  }
  in_fm { print }
' "$ADR_FILE")

if [ -n "$FRONTMATTER" ]; then
  CHECKS+=("frontmatter=present")
  for meta in status date; do
    if printf '%s\n' "$FRONTMATTER" | grep -q "^${meta}:"; then
      VALUE=$(printf '%s\n' "$FRONTMATTER" | grep -m 1 "^${meta}:" || true)
      CHECKS+=("metadata:${meta}=ok [${VALUE}]")
    else
      WARNINGS+=("missing_metadata:${meta} (recommended in MADR v4 frontmatter)")
    fi
  done
else
  WARNINGS+=("missing_frontmatter (MADR v4 supports optional YAML frontmatter for status/date/decision-makers)")
fi

# MADR v4 lists Considered Options as bullets, then Pros and Cons of the Options uses ### headings.
# Count bullets directly under the "## Considered Options" section.
OPTIONS_COUNT=$(awk '
  /^## Considered Options[[:space:]]*$/ { in_opts = 1; next }
  in_opts && /^## / { in_opts = 0 }
  in_opts && /^[[:space:]]*([-*]|[0-9]+\.)[[:space:]]/ { count++ }
  END { print count + 0 }
' "$ADR_FILE")
if [ "$OPTIONS_COUNT" -ge 2 ]; then
  CHECKS+=("options_count=${OPTIONS_COUNT}")
elif [ "$OPTIONS_COUNT" -eq 1 ]; then
  WARNINGS+=("options_count=1 (recommended: 2+)")
else
  ERRORS+=("options_count=0")
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
