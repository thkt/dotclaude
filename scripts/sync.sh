#!/bin/zsh
set -u
# Exit 0: all checks pass, Exit 1: sync errors found

CLAUDE_DIR="${HOME}/.claude"
JA_DIR="${CLAUDE_DIR}/.ja"

SCAN_DIRS=(commands agents rules skills templates docs plugins)

errors=0
warnings=0

pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; errors=$((errors + 1)); }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; warnings=$((warnings + 1)); }

collect_md_files() {
  local base_dir="$1"
  local files=()
  # Root *.md (exclude RTK.md — no JP counterpart by design)
  for f in "${base_dir}"/*.md(N); do
    [[ "${f:t}" == "RTK.md" ]] && continue
    files+=("${f#${base_dir}/}")
  done
  # Scan directories
  for dir in "${SCAN_DIRS[@]}"; do
    [[ -d "${base_dir}/${dir}" ]] || continue
    for f in "${base_dir}/${dir}"/**/*.md(N); do
      [[ "$f" == */adr/* ]] && continue
      [[ "$f" == */plugins/cache/* ]] && continue
      [[ "$f" == */plugins/marketplaces/* ]] && continue
      files+=("${f#${base_dir}/}")
    done
  done
  printf '%s\n' "${files[@]}"
}

check_missing_translations() {
  echo "Check 1: Missing translations (EN → .ja/)"
  local en_files=("${(@f)$(collect_md_files "$CLAUDE_DIR")}")
  local missing=0

  for rel_path in "${en_files[@]}"; do
    [[ -z "$rel_path" ]] && continue
    if [[ -f "${JA_DIR}/${rel_path}" ]]; then
      pass "${rel_path}"
    else
      fail "${rel_path} → .ja/ counterpart missing"
      missing=$((missing + 1))
    fi
  done

  [[ $missing -eq 0 ]] && [[ ${#en_files[@]} -gt 0 ]]
}

check_orphan_translations() {
  echo "\nCheck 2: Orphan translations (.ja/ → EN)"
  local ja_files=("${(@f)$(collect_md_files "$JA_DIR")}")
  local orphans=0

  for rel_path in "${ja_files[@]}"; do
    [[ -z "$rel_path" ]] && continue
    if [[ -f "${CLAUDE_DIR}/${rel_path}" ]]; then
      pass ".ja/${rel_path}"
    else
      warn ".ja/${rel_path} → EN source missing (orphan)"
      orphans=$((orphans + 1))
    fi
  done
}

check_include_paths() {
  echo "\nCheck 3: @-include path validation"
  local ja_files=("${(@f)$(collect_md_files "$JA_DIR")}")
  local broken=0

  for rel_path in "${ja_files[@]}"; do
    [[ -z "$rel_path" ]] && continue
    local full_path="${JA_DIR}/${rel_path}"
    local file_dir="${full_path:h}"

    while IFS= read -r include_path; do
      [[ -z "$include_path" ]] && continue
      local resolved="${file_dir}/${include_path}"
      # Normalize path (resolve ../)
      resolved="${resolved:a}"

      if [[ -f "$resolved" ]]; then
        pass ".ja/${rel_path}: @${include_path}"
      else
        fail ".ja/${rel_path}: @${include_path} → file not found"
        broken=$((broken + 1))
      fi
    done < <(grep -oE '\[@([^]]+)\]' "$full_path" 2>/dev/null \
      | sed 's/^\[@//; s/\]$//' \
      | grep -v '^http')
  done
}

# --- Main ---

if [[ ! -d "$JA_DIR" ]]; then
  fail ".ja/ directory not found at ${JA_DIR}"
  echo "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf '\033[31m1 error(s)\033[0m\n'
  exit 1
fi

check_missing_translations
check_orphan_translations
check_include_paths

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
