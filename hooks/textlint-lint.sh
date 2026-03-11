#!/usr/bin/env bash
# PreToolUse hook: lint text + structure review checklist for gh issue/pr create
# Returns advisory (approve + additionalContext) with textlint results and structure checklist
set -uo pipefail

TEXTLINT_DIR="$HOME/.claude/textlint"
TEXTLINT_CONFIG="$TEXTLINT_DIR/.textlintrc.json"

# Japanese detection: ≥50 hiragana/katakana/kanji characters
has_japanese() { [[ $(echo "$1" | LC_ALL=en_US.UTF-8 grep -o '[ぁ-んァ-ヶー一-龥]' | wc -l) -ge 50 ]]; }

STRUCTURE_CHECKLIST='## 構造レビュー（ワークスロップ防止）\n\nbody を送信する前に、以下を確認してください：\n\n| チェック | 問い |\n|---|---|\n| 筆者の判断 | 筆者自身の結論が1〜3行で冒頭に書かれているか？AI出力が主役になっていないか |\n| 半分にできるか | この文書は半分にできるか？できないなら何が重要か分かっていない可能性がある |\n| 事実と意見の区別 | 事実・推測・提案にラベルが貼られ、分離されているか |\n| アクションの明確さ | 読み手に求める行動が具体的か（「ご確認ください」ではなく「Xを判断してください」） |\n| 読み手の認知負荷 | この文書は読み手の負荷を下げているか、仕事を押し付けていないか |\n\n問題がある項目のみ body を修正してください。'

input=$(cat)
read -r tool_name command_str < <(echo "$input" | jq -r '[.tool_name // "", .tool_input.command // ""] | @tsv' 2>/dev/null) || true
# @tsv doubles backslashes — undo to get original command string
command_str="${command_str//\\\\/\\}"

if [[ "$tool_name" != "Bash" || -z "$command_str" ]]; then
  exit 0
fi

if ! echo "$command_str" | grep -qE 'gh (issue|pr) create'; then
  exit 0
fi

body=$(echo "$command_str" | sed -nE 's/.*--body "(([^"\\]|\\.)*)".*/\1/p')
if [[ -z "$body" ]]; then
  body=$(echo "$command_str" | sed -nE "s/.*--body '([^']*)'.*/\1/p")
fi

if [[ -z "$body" ]]; then
  exit 0
fi

lint_section=""
if [[ -f "$TEXTLINT_CONFIG" ]] && has_japanese "$body"; then
  tmpfile=$(mktemp /tmp/textlint-lint-XXXXXX.md)
  trap 'rm -f "$tmpfile"' EXIT
  echo "$body" > "$tmpfile"

  if command -v bun &>/dev/null; then
    runner="bun x"
  else
    runner="npx"
  fi

  cd "$TEXTLINT_DIR" || exit 0
  lint_output=$($runner textlint --config "$TEXTLINT_CONFIG" "$tmpfile" 2>/dev/null) || true

  if [[ -n "$lint_output" ]]; then
    lint_clean=$(echo "$lint_output" | grep -v "^$tmpfile$" | sed "s|$tmpfile|body|g")
    lint_section="## textlint 校正結果\n\n以下の指摘を確認し、必要に応じて body テキストを修正してください。\n\n$lint_clean\n\n"
  fi
fi

jq -nc --arg r "textlint: 日本語校正 + 構造レビュー" --arg c "${lint_section}${STRUCTURE_CHECKLIST}" '{"decision":"approve","reason":$r,"additionalContext":$c}'
