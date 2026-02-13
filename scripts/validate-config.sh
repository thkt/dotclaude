#!/bin/zsh
# Exit 0: all checks pass, Exit 1: validation errors found

CLAUDE_DIR="${HOME}/.claude"
AGENTS_DIR="${CLAUDE_DIR}/agents"
SKILLS_DIR="${CLAUDE_DIR}/skills"
COMMANDS_DIR="${CLAUDE_DIR}/commands"
SCHEMA_FILE="${CLAUDE_DIR}/templates/audit/finding-schema.yaml"

errors=0
warnings=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; errors=$((errors + 1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; warnings=$((warnings + 1)); }

get_frontmatter_value() {
  local file="$1" key="$2"
  sed -n '/^---$/,/^---$/p' "$file" | grep "^${key}:" | head -1 | sed "s/^${key}:[[:space:]]*//"
}

validate_model() {
  local file="$1"
  local model=$(get_frontmatter_value "$file" "model")
  [[ -z "$model" ]] && return

  if [[ "$model" =~ ^(haiku|sonnet|opus)$ ]]; then
    pass "${file:t}: model '${model}' valid"
  else
    fail "${file:t}: model '${model}' → must be haiku|sonnet|opus"
  fi
}

echo "Check 1: Agent skill references"
for agent_file in "${AGENTS_DIR}"/**/*.md(N); do
  skills_raw=$(get_frontmatter_value "$agent_file" "skills")
  [[ -z "$skills_raw" ]] && continue

  skills_raw="${skills_raw//[\[\]]/}"
  IFS=',' read -rA skill_list <<< "$skills_raw"
  for skill in "${skill_list[@]}"; do
    skill="${skill//[[:space:]]/}"
    [[ -z "$skill" ]] && continue

    skill_dir="${skill%%:*}"
    if [[ -d "${SKILLS_DIR}/${skill_dir}" ]]; then
      pass "${agent_file:t}: skill '${skill}' exists"
    elif [[ "$skill" == *:* ]]; then
      pass "${agent_file:t}: skill '${skill}' (plugin)"
    else
      fail "${agent_file:t}: skill '${skill}' → directory not found: skills/${skill_dir}/"
    fi
  done
done

echo "\nCheck 2: Command agent references"
for cmd_file in "${COMMANDS_DIR}"/*.md(N); do
  while read -r match; do
    agent_name="${match##*[ :]}"
    [[ "$agent_name" == "general-purpose" ]] && continue

    found=$(printf '%s\n' "${AGENTS_DIR}"/**/${agent_name}.md(N[1]))
    if [[ -n "$found" ]]; then
      pass "${cmd_file:t}: agent '${agent_name}' exists"
    else
      fail "${cmd_file:t}: agent '${agent_name}' → file not found"
    fi
  done < <(grep -oE 'subagent_type[: ]+[a-z][-a-z0-9]*-[a-z0-9][-a-z0-9]*' "$cmd_file" 2>/dev/null)
done

echo "\nCheck 3: Finding schema PREFIX → reviewer mapping"
if [[ -f "$SCHEMA_FILE" ]]; then
  check3_count=0
  while read -r line; do
    check3_count=$((check3_count + 1))
    prefix=$(printf '%s' "$line" | sed 's/^# | *\([A-Z0-9]*\) .*/\1/')
    reviewer=$(printf '%s' "$line" | sed 's/.*| *\([a-z][-a-z]*\) *|.*/\1/')
    [[ -z "$reviewer" || "$reviewer" == "$line" ]] && continue

    if [[ -f "${AGENTS_DIR}/reviewers/${reviewer}.md" ]]; then
      pass "${prefix} → ${reviewer} exists"
    else
      fail "${prefix} → ${reviewer} → file not found: reviewers/${reviewer}.md"
    fi
  done < <(sed -n '/^# --- ID prefix registry/,/^# ---/p' "$SCHEMA_FILE" \
    | grep '^# |' | grep -v 'Prefix\|------')
  [[ $check3_count -eq 0 ]] && warn "No prefix entries found in schema — section header may have changed"
else
  fail "finding-schema.yaml not found"
fi

echo "\nCheck 4: Frontmatter model values"
for file in "${AGENTS_DIR}"/**/*.md(N) "${COMMANDS_DIR}"/*.md(N); do
  validate_model "$file"
done

echo "\nCheck 5: Orphan detection (agents not referenced)"
typeset -a search_paths=(
  "${COMMANDS_DIR}"/*.md(N)
  "${AGENTS_DIR}"/**/*.md(N)
  "${SKILLS_DIR}"/*/SKILL.md(N)
  "${CLAUDE_DIR}"/templates/**/*.yaml(N)
  "${CLAUDE_DIR}"/templates/**/*.md(N)
)
typeset -A dynamic_agents=(
  [feature-architect]="/feature team"
  [feature-explorer]="/feature team"
  [devils-advocate-audit]="audit pipeline"
  [devils-advocate-design]="audit pipeline"
  [evidence-verifier]="audit pipeline"
  [progressive-integrator]="/code team"
  [unit-implementer]="/code team"
  [subagent-reviewer]="audit sub-reviewer"
)
for agent_file in "${AGENTS_DIR}"/**/*.md(N); do
  agent_name="${agent_file:t:r}"

  if [[ -n "${dynamic_agents[$agent_name]}" ]]; then
    pass "${agent_name}: dynamic (${dynamic_agents[$agent_name]})"
    continue
  fi

  ref_count=$(grep -Frlw -- "$agent_name" "${search_paths[@]}" \
    2>/dev/null | grep -Fv "$agent_file" | wc -l | tr -d ' ')

  if [[ "$ref_count" -gt 0 ]]; then
    pass "${agent_name}: referenced ${ref_count} time(s)"
  else
    warn "${agent_name}: no references found (may be orphan)"
  fi
done

echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $errors -eq 0 ]]; then
  printf '\033[32mAll checks passed.\033[0m'
  [[ $warnings -gt 0 ]] && printf ' (%d warnings)' "$warnings"
  echo
  exit 0
else
  printf '\033[31m%d error(s)\033[0m' "$errors"
  [[ $warnings -gt 0 ]] && printf ', %d warning(s)' "$warnings"
  echo
  exit 1
fi
