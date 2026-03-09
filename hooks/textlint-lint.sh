#!/usr/bin/env bash
# PreToolUse hook: lint text + structure review checklist for gh issue/pr create
# Returns advisory (approve + additionalContext) with textlint results and structure checklist
set -uo pipefail

TEXTLINT_DIR="$HOME/.claude/textlint"
TEXTLINT_CONFIG="$TEXTLINT_DIR/.textlintrc.json"

STRUCTURE_CHECKLIST='## 構造レビュー（ワークスロップ防止）\n\nbody を送信する前に、以下を確認してください：\n\n| チェック | 問い |\n|---|---|\n| 筆者の判断 | 筆者自身の結論が1〜3行で冒頭に書かれているか？AI出力が主役になっていないか |\n| 半分にできるか | この文書は半分にできるか？できないなら何が重要か分かっていない可能性がある |\n| 事実と意見の区別 | 事実・推測・提案にラベルが貼られ、分離されているか |\n| アクションの明確さ | 読み手に求める行動が具体的か（「ご確認ください」ではなく「Xを判断してください」） |\n| 読み手の認知負荷 | この文書は読み手の負荷を下げているか、仕事を押し付けていないか |\n\n問題がある項目のみ body を修正してください。'

# Read hook JSON from stdin — parse tool_name and command in single jq call
input=$(cat)
read -r tool_name command_str < <(echo "$input" | jq -r '[.tool_name // "", .tool_input.command // ""] | @tsv' 2>/dev/null) || true

if [[ "$tool_name" != "Bash" || -z "$command_str" ]]; then
  exit 0
fi

# Only match gh issue/pr create
if ! echo "$command_str" | grep -qE 'gh (issue|pr) create'; then
  exit 0
fi

# Extract --body value (double or single quoted)
body=""
if echo "$command_str" | grep -qE -- '--body "[^"]*"'; then
  body=$(echo "$command_str" | sed -nE 's/.*--body "([^"]*)".*/\1/p')
elif echo "$command_str" | grep -qE -- "--body '[^']*'"; then
  body=$(echo "$command_str" | sed -nE "s/.*--body '([^']*)'.*/\1/p")
fi

if [[ -z "$body" ]]; then
  exit 0
fi

# Run textlint if config exists
lint_section=""
if [[ -f "$TEXTLINT_CONFIG" ]]; then
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

# Output advisory JSON (always include structure checklist)
cat <<EOF
{"decision":"approve","reason":"textlint: 日本語校正 + 構造レビュー","additionalContext":"${lint_section}${STRUCTURE_CHECKLIST}"}
EOF
