---
name: preview
description: PR への AI スクリーニングレビュー。人間レビュー前の予備チェック。深い multi-reviewer コード品質監査には使わない (/audit を使う)。
when_to_use: スクリーニング, PRレビュー, プレビュー, preview PR, pre-review
allowed-tools: Bash(git:*) Bash(gh:*) Read AskUserQuestion Bash(ugrep:*) Bash(bfs:*)
model: opus
argument-hint: "[PR URL or number]"
---

# /preview - PR スクリーニングレビュー

## 入力

- PR 参照: `$ARGUMENTS` (URL、番号、または空 → 現在ブランチから検出)

## 実行

| Step | 動作                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| 1    | PR 識別: `gh pr view $ARGUMENTS --json number,title,body,labels,files,url` (フォールバック: `$ARGUMENTS` 省略) |
| 2    | PR がない、または作業ツリーが dirty (`git status --porcelain`) なら中止                                        |
| 3    | PR を checkout: `gh pr checkout $PR`                                                                           |
| 4    | PR コンテキストを並列収集 (下記参照)                                                                           |
| 5    | 各変更ファイルを diff hunks 外も含めて完全に読む                                                               |
| 6    | プロセスに沿ってレビュー: 概観 → ファイルごと → 依存影響 → findings                                         |
| 7    | 構造化スクリーニングレポートを出力                                                                             |

### PR コンテキスト収集

```bash
# Metadata
gh pr view --json title,body,labels,files,url $PR

# Diff
gh pr diff $PR

# 既存コメント
gh pr view --comments $PR

# inline コメント
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  --jq '.[] | {file: .path, user: .user.login, comment: .body}'
```

gh の出力フィールドに `author` を含めない。

## コメントラベル

| ラベル   | 意味                             | 重大度 |
| -------- | -------------------------------- | ------ |
| `[must]` | merge 前に修正必須               | High   |
| `[want]` | 修正すべき、ブロックしない       | Medium |
| `[imo]`  | 個人意見、採用は任意             | Low    |
| `[ask]`  | 明確化のための質問               | -      |
| `[nits]` | 軽微なスタイル/フォーマット問題  | Low    |
| `[info]` | コンテキスト共有、アクション不要 | -      |

## コメントトーン

| ルール   | 詳細                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 形式     | `[label] <observed behavior or risk>. <suggestion>. (file:line)`           |
| 簡潔     | `[imo]`/`[nits]`/`[info]` は 3 行、`[must]`/`[want]` は根拠付きで最大 5 行 |
| 敬意     | 努力を認める、命令を避ける                                                 |
| 提案的   | "Consider..." を使い、"This is wrong" は避ける                             |
| 著者向け | コメントは verbatim で投稿される可能性あり、PR 著者向けに詳細度を調整      |

## 出力

```markdown
## PR Screening Report

### Overview

{背景と目的を 2-3 文で}

### Changes Summary

| File | Change Summary |
| ---- | -------------- |

### Dependency Impact

{影響ファイル、回帰リスク}

---

### Requires Action

{`[must]` と `[want]` の findings、file:line 付き}

### Awareness

{`[imo]`, `[ask]`, `[nits]`, `[info]` のアイテム、file:line 付き}

---

### Proposed Review Comments

{ファイルでグループ化、ラベル付き}
```

## ルール

| ルール         | 詳細                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| 自動投稿しない | コメントを PR に自動投稿しない                                         |
| dirty で中止   | uncommitted changes があれば警告して中止                               |
| 深さより速さ   | これはスクリーニング、フル監査ではない                                 |
| flag 前に検証  | [ask]/[want]+ 前に、問題を到達可能なランタイム呼び出し箇所まで追跡する |

## 参照

| トピック         | ファイル                                           |
| ---------------- | -------------------------------------------------- |
| Review Checklist | ${CLAUDE_SKILL_DIR}/references/review-checklist.md |
