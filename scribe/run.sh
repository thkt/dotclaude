#!/usr/bin/env bash
# scribe: 対象リポのコード構造を docs/wiki/ に蓄積し PR で提案する。
# Usage:
#   run.sh <対象リポのパス>   1リポだけ処理（初回=全体, 以降=差分）
#   run.sh                    巡回モード。平日のみ、SCAN_ROOTS 配下で docs/wiki/README.md を持つリポを順に処理
#
# state は持たない。差分の基準は「最後にマージされた scribe PR の merge commit」を gh から都度導出する。
# 未マージの scribe PR が残っている間は重複防止のためスキップする。
# codex は隔離 worktree（run.sh が作成済みのブランチ）内で編集・commit・push・PR のみ行う。
# ユーザーのライブ checkout は一切動かさない。
set -euo pipefail

SCRIBE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIBE_DIR/logs"
CODEX_BIN="${CODEX_BIN:-codex}"

mkdir -p "$LOG_DIR"
find "$LOG_DIR" -name '*.log' -mtime +7 -delete 2>/dev/null || true
unset CLAUDECODE  # 手動テスト時に Claude Code セッション内から叩けるようにする

# --- 巡回モード（引数なし。launchd の入口）---
if [[ $# -eq 0 ]]; then
  "$HOME/.claude/lib/check-workday.sh" "$LOG_DIR" || { echo "平日ではないためスキップ"; exit 0; }
  for repo in "$HOME/Personal" "$HOME"/GitHub/*/*; do
    [[ -f "$repo/docs/wiki/README.md" ]] || continue
    echo "--- scribe run: $repo ---"
    "$0" "$repo" || echo "失敗: $repo（続行）"
  done
  exit 0
fi

# --- 対象リポの解決と前提チェック ---
TARGET="$(cd "$1" 2>/dev/null && pwd)" || { echo "対象リポが見つからない: $1"; exit 1; }
[[ -f "$TARGET/docs/wiki/README.md" ]] || { echo "skip: $TARGET （docs/wiki/README.md が無い。SETUP.md 参照）"; exit 0; }
cd "$TARGET"

# --- リポ情報（slug と PR base。gh 必須。取れなければ誤った全巡回を防ぐため中断）---
SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner)" || { echo "error: $TARGET （gh でリポ情報を取れない）"; exit 1; }
BASE="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"
git fetch origin "$BASE" --quiet 2>/dev/null || true

OPEN_PR="$(gh pr list --label scribe --state open --limit 1 --json number -q '.[0].number')"
[[ -z "$OPEN_PR" ]] || { echo "skip: $SLUG （scribe PR #$OPEN_PR が未マージ）"; exit 0; }

# --- スコープ決定（基準 = 最後にマージされた scribe PR の merge commit）---
LAST_MERGE="$(gh pr list --label scribe --state merged --limit 1 --json mergeCommit -q '.[0].mergeCommit.oid')"
if [[ -z "$LAST_MERGE" ]]; then
  SCOPE_DESC="初回巡回。コードベース全体が対象。"
else
  CHANGED="$(git log "${LAST_MERGE}..${BASE}" --name-only --pretty=format: | sort -u | grep -v '^$' || true)"
  [[ -n "$CHANGED" ]] || { echo "変更なし: $SLUG （${LAST_MERGE}..${BASE}）"; exit 0; }
  SCOPE_DESC="差分巡回。最後にマージされた scribe PR（${LAST_MERGE}）以降に変更されたファイル群が対象:
$CHANGED"
fi

# --- 隔離 worktree（デフォルトブランチから新ブランチ）---
NOW="$(TZ=Asia/Tokyo date +%Y%m%d-%H%M%S)"
BRANCH="scribe/$NOW"
WORKTREE_PARENT="$(mktemp -d)"
WORKTREE="$WORKTREE_PARENT/wt"
cleanup() {
  git -C "$TARGET" worktree remove --force "$WORKTREE" 2>/dev/null || true
  rm -rf "$WORKTREE_PARENT"
}
trap cleanup EXIT
git worktree add -b "$BRANCH" "$WORKTREE" "$BASE" >/dev/null

echo "=== scribe: $SLUG ($NOW) branch=$BRANCH base=$BASE ==="

# --- codex 実行（worktree 内で wiki 生成 + PR 作成）---
"$CODEX_BIN" exec "$(cat "$SCRIBE_DIR/PROMPT.md")

## 今回のスコープ

対象リポ: ${SLUG}（作業ディレクトリ = このリポのルート）
作業ブランチ: ${BRANCH}（作成済み。あなたはこのブランチ上にいる。改めて作らない）
PR の base: ${BASE}
${SCOPE_DESC}" \
  --cd "$WORKTREE" \
  --dangerously-bypass-approvals-and-sandbox \
  2>&1 | tee "$LOG_DIR/${NOW}_$(echo "$SLUG" | tr '/' '_').log"
