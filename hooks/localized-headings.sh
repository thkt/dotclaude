#!/usr/bin/env bash
# PreToolUse hook: block gh issue/pr create when title/headings are not in configured language
# Uses bash (not zsh) because BASH_REMATCH is required for heading regex extraction.
set -euo pipefail

input=$(cat)

# Fast-exit: skip jq+grep forks unless input is a Bash `gh ... create` call
# (this hook fires on every Bash invocation; ~99% are irrelevant)
case "$input" in
  *'"tool_name":"Bash"'*gh*create*) ;;
  *) exit 0 ;;
esac

read -r tool_name command_str < <(echo "$input" | jq -r '[.tool_name // "", .tool_input.command // ""] | @tsv' 2>/dev/null) || true
# @tsv doubles backslashes — undo to get original command string
command_str="${command_str//\\\\/\\}"

# Match only at a command position (start, after ; & | or $() — not inside
# heredoc / echo data that merely contains the literal string.
create_re='(^|[;&|][[:space:]]*|\$\()[[:space:]]*gh[[:space:]]+(issue|pr)[[:space:]]+create'
[[ "$command_str" =~ $create_re ]] || exit 0

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

# Extract --title (double-quoted or single-quoted) — BASH_REMATCH, zero forks
title=""
if [[ "$command_str" =~ --title[[:space:]]+\"(([^\"\\]|\\.)*)\" ]]; then
  title="${BASH_REMATCH[1]}"
elif [[ "$command_str" =~ --title[[:space:]]+\'([^\']*)\' ]]; then
  title="${BASH_REMATCH[1]}"
fi
if [[ -n "$title" ]] && ! has_lang "$title"; then
  errors+=("title: $title")
fi

# Extract --body — BASH_REMATCH, zero forks
body=""
if [[ "$command_str" =~ --body[[:space:]]+\"(([^\"\\]|\\.)*)\" ]]; then
  body="${BASH_REMATCH[1]}"
elif [[ "$command_str" =~ --body[[:space:]]+\'([^\']*)\' ]]; then
  body="${BASH_REMATCH[1]}"
fi
if [[ -n "$body" ]]; then
  # Unescape literal \n to newline via parameter expansion (no sed fork)
  body="${body//\\n/$'\n'}"
  while IFS= read -r line; do
    if [[ "$line" =~ ^#{1,6}[[:space:]](.+)$ ]]; then
      heading="${BASH_REMATCH[1]}"
      heading="${heading%"${heading##*[![:space:]]}"}"
      [[ -n "$heading" ]] && ! has_lang "$heading" && errors+=("heading: $heading")
    fi
  done <<< "$body"
fi

if [[ ${#errors[@]} -gt 0 ]]; then
  reason="language: ${lang} — Items still in English:"
  for e in "${errors[@]}"; do reason+=$'\n'"- $e"; done
  reason+=$'\n\n'"Translate title and headings to ${lang} before creating."
  jq -nc --arg r "$reason" '{"decision":"block","reason":$r}'
fi
