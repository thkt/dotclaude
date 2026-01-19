#!/bin/bash
# IDR Confirmation Gate - recording happens in session-end.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_utils.sh"

BLOCKER_LINE="- [ ] 確認完了（このチェックボックスをチェックして保存）"

get_editor() {
  if command -v cursor &> /dev/null; then
    echo "cursor --wait"
  elif command -v code &> /dev/null; then
    echo "code --wait"
  else
    echo "${EDITOR:-vim}"
  fi
}

open_and_verify() {
  local confirm_file="$1"
  local -a editor_cmd
  read -ra editor_cmd <<< "$(get_editor)"
  echo "📝 確認ファイルを開いています: $confirm_file"
  "${editor_cmd[@]}" "$confirm_file"

  if grep -q "\[ \] 確認完了" "$confirm_file"; then
    echo "❌ 確認が完了していません"
    echo "   チェックボックスを [x] にしてからコミットしてください"
    exit 1
  fi
  echo "✅ 確認完了。コミットを実行します"
}

get_fallback_questions() {
  echo "- [ ] 変更内容を理解しましたか？"
  echo "- [ ] テストは十分ですか？"
  echo "- [ ] 既存機能への影響は確認しましたか？"
}

get_purpose_summary() {
  local session_jsonl="$1"
  [ -z "$session_jsonl" ] && return

  local context=""
  [ -f "${SCRIPT_DIR}/_context-extractor.sh" ] && \
    context=$("${SCRIPT_DIR}/_context-extractor.sh" "$session_jsonl" 2>/dev/null || echo "")

  if command -v claude &> /dev/null && [ -n "$context" ]; then
    claude -p --model haiku "
Extract the main purpose of this session in ONE line (Japanese).
Focus on WHAT the user wants to achieve, not HOW.

Context:
$context

Output format: Single line, no prefix, no explanation.
" 2>/dev/null || echo ""
  fi
}

get_change_summary() {
  local diff="$1"
  [ -z "$diff" ] && return

  if command -v claude &> /dev/null; then
    claude -p --model haiku "
Summarize the following diff as bullet points (3-5 items).
- Focus on WHAT changed, not line-by-line details
- Japanese language
- No greetings

Diff:
$diff

Output format:
- Change 1
- Change 2
- Change 3
" 2>/dev/null || echo "- (要約生成失敗)"
  else
    echo "- (Claude 不可)"
  fi
}

get_review_questions() {
  local diff="$1"
  [ -z "$diff" ] && return

  if command -v claude &> /dev/null; then
    claude -p --model haiku "
You are a senior engineer reviewing code changes.
Generate 3-5 review questions for the following diff.

Requirements:
- Questions should verify the developer understands the changes
- Include: design intent, edge cases, potential bugs, impact
- Output as markdown checkbox list
- Japanese language
- No greetings or explanations

Diff:
$diff

Output format:
- [ ] Question 1
- [ ] Question 2
- [ ] Question 3
" 2>/dev/null || get_fallback_questions
  else
    get_fallback_questions
  fi
}

check_diff_size() {
  local diff="$1"
  local threshold="${2:-200}"

  local line_count
  line_count=$(echo "$diff" | wc -l | tr -d ' ')

  if [ "$line_count" -gt "$threshold" ]; then
    echo "⚠️ **警告**: 変更が${threshold}行を超えています（${line_count}行）。コミットの分割を検討してください。"
    echo ""
  fi
}

main() {
  has_session_changes || exit 0
  git diff --cached --quiet && exit 0

  local idr_file idr_dir confirm_file
  idr_file=$(resolve_idr_file)
  idr_dir=$(dirname "$idr_file")
  mkdir -p "$idr_dir"
  confirm_file="${idr_dir}/.idr-confirm.md"

  # Already confirmed? Skip.
  if [ -f "$confirm_file" ] && grep -q "\[x\] 確認完了" "$confirm_file"; then
    echo "✅ 確認完了。コミットを実行します"
    exit 0
  fi

  # Existing but unchecked? Re-open.
  if [ -f "$confirm_file" ] && grep -q "\[ \] 確認完了" "$confirm_file"; then
    open_and_verify "$confirm_file"
    exit $?
  fi

  # Generate new confirmation file
  local session_jsonl diff diff_stat
  session_jsonl=$(find_session_jsonl)
  diff=$(git diff --cached 2>/dev/null)
  diff_stat=$(git diff --cached --stat 2>/dev/null)

  local purpose summary questions warning
  purpose=$(get_purpose_summary "$session_jsonl")
  summary=$(get_change_summary "$diff")
  questions=$(get_review_questions "$diff")
  warning=$(check_diff_size "$diff" 200)

  cat > "$confirm_file" << EOF
# コミット確認

> $(date +%Y-%m-%d\ %H:%M)

## 変更サマリー

**目的**: ${purpose:-"(目的抽出失敗)"}

**変更内容**:
${summary:-"- (要約生成失敗)"}

${warning}
### git diff --stat
\`\`\`
${diff_stat}
\`\`\`

## 確認項目

${questions}

## メモ（任意）



---

### 完了確認

${BLOCKER_LINE}
EOF

  open_and_verify "$confirm_file"
}

main "$@"
