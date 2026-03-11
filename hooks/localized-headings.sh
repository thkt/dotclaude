#!/usr/bin/env bash
# PreToolUse hook: block gh issue/pr create when title/headings are not in configured language
set -uo pipefail

input=$(cat)
read -r tool_name command_str < <(echo "$input" | jq -r '[.tool_name // "", .tool_input.command // ""] | @tsv' 2>/dev/null) || true
# @tsv doubles backslashes — undo to get original command string
command_str="${command_str//\\\\/\\}"

[[ "$tool_name" == "Bash" ]] || exit 0
echo "$command_str" | grep -qE 'gh (issue|pr) create' || exit 0

# Language → Unicode pattern (Latin-script languages cannot be distinguished from English)
lang=$(jq -r '.language // ""' "$HOME/.claude/settings.json" 2>/dev/null)
case "$lang" in
  japanese) char_pattern='[ぁ-んァ-ヶー一-龥]' ;;
  korean)   char_pattern='[가-힣ㄱ-ㅎㅏ-ㅣ]' ;;
  chinese)  char_pattern='[一-龥]' ;;
  *)        exit 0 ;;
esac

has_lang() { local LC_ALL=en_US.UTF-8; [[ "$1" =~ $char_pattern ]]; }

errors=()

# Extract --title
title=$(echo "$command_str" | sed -nE 's/.*--title "(([^"\\]|\\.)*)".*/\1/p')
[[ -z "$title" ]] && title=$(echo "$command_str" | sed -nE "s/.*--title '([^']*)'.*/\1/p")
if [[ -n "$title" ]] && ! has_lang "$title"; then
  errors+=("title: $title")
fi

# Extract --body and check headings
body=$(echo "$command_str" | sed -nE 's/.*--body "(([^"\\]|\\.)*)".*/\1/p')
[[ -z "$body" ]] && body=$(echo "$command_str" | sed -nE "s/.*--body '([^']*)'.*/\1/p")
if [[ -n "$body" ]]; then
  while IFS= read -r line; do
    if [[ "$line" =~ ^#{1,6}[[:space:]](.+)$ ]]; then
      heading="${BASH_REMATCH[1]}"
      heading="${heading%"${heading##*[![:space:]]}"}"
      [[ -n "$heading" ]] && ! has_lang "$heading" && errors+=("heading: $heading")
    fi
  done < <(echo "$body" | sed 's/\\n/\n/g')
fi

if [[ ${#errors[@]} -gt 0 ]]; then
  reason="language: ${lang} — Items still in English:"
  for e in "${errors[@]}"; do reason+=$'\n'"- $e"; done
  reason+=$'\n\n'"Translate title and headings to ${lang} before creating."
  jq -nc --arg r "$reason" '{"decision":"block","reason":$r}'
fi
