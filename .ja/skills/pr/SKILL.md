---
name: pr
description: ブランチ変更を分析して PR 説明文を生成する。
when_to_use: PR作って, プルリクエスト, pull request, PR作成
allowed-tools: Bash(git:*) Bash(gh:*) Read AskUserQuestion Skill
model: opus
argument-hint: "[issue reference or context]"
---

# /pr - Pull Request 説明文生成

## 入力

- Issue 参照またはコンテキスト: `$ARGUMENTS` (任意、例: `#456`)
- `$ARGUMENTS` が空 → 現在ブランチからのみ生成

## 実行

| Step | 動作                                                                         |
| ---- | ---------------------------------------------------------------------------- |
| 1    | 分析: `git status`, `git diff <base>...HEAD`, `git log <base>..HEAD` (並列)  |
| 2    | base ブランチを検出 (Base Branch Detection を参照)                           |
| 3    | AskUserQuestion で base ブランチを選択 (選択肢: main / develop / [検出済み]) |
| 4    | UI 変更検出 (下記参照)                                                       |
| 5    | PR テンプレートに従いタイトルと本文を生成 (下記参照)                         |
| 6    | prose review で本文をインライン精査 (下記参照)                               |
| 7    | PR プレビュー → AskUserQuestion: "Create this PR?"                          |
| 8    | UI 変更時: Skill で `use-workflow-pageshot` を PR 本文と共に呼ぶ (下記参照)  |
| 9    | push コマンドを表示 (手動実行)                                               |
| 10   | PR 作成: `gh pr create --title "..." --body "..."`                           |
| 11   | pageshot 成果物が存在: 成果物パスと手動貼り付け案内を表示                    |

## 分析ソース

| カテゴリ | ソース                   |
| -------- | ------------------------ |
| Changes  | `git diff <base>...HEAD` |
| Commits  | `git log <base>..HEAD`   |
| Files    | `git diff --name-status` |

## 変更種別検出

| 種別     | キーワード                      |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## 言語

${CLAUDE_SKILL_DIR}/../../settings.json から `language` を読み、その言語で PR 本文を翻訳する。未設定なら英語をデフォルト。技術用語、コード、識別子は翻訳しない。

## タイトルルール

| ルール        | 形式                                                 |
| ------------- | ---------------------------------------------------- |
| Prefix        | なし (`feat:`, `fix:` など使わない)                  |
| With Issue    | Issue タイトルをそのまま使う                         |
| Without Issue | 命令形動詞 + 説明 (72 文字以内)                      |
| Examples      | `Add user authentication`, `Fix login timeout issue` |

## PR テンプレート

${CLAUDE_SKILL_DIR}/templates/pr.md

### Design Decisions の検出

`Design Decisions` は commit ごとでなく PR レベルで集約する。`git diff <base>...HEAD` と `git log <base>..HEAD` から検出する。

| シグナル                               | 例                               |
| -------------------------------------- | -------------------------------- |
| 同等な代替肢の中で明示的に選択         | "Used X over Y because..."       |
| パフォーマンス/型/互換性のトレードオフ | "Chose X to avoid Y"             |
| 既存パターンからの逸脱                 | "Deviated from X for..."         |
| ライブラリ/API の選定                  | "Selected X (over Y) because..." |

ルーチンな実装のみ (明示的トレードオフなし) → Design Decisions セクションを省略する。

## Base ブランチ検出

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# Fallback: main → master → develop
```

## UI 変更検出

`git diff --name-only {base}...HEAD` が以下の拡張子を含めば UI 変更とみなす。

| 拡張子                                          | 種別        |
| ----------------------------------------------- | ----------- |
| `.tsx` / `.jsx` / `.vue` / `.svelte` / `.astro` | Component   |
| `.html`                                         | Page        |
| `.css` / `.scss` / `.sass` / `.less`            | Style       |
| `*.module.css` / `*.module.scss`                | CSS Modules |

UI 変更なし → Pageshot Integration をスキップ。

## Pageshot Integration

Skill ツールで `use-workflow-pageshot` skill を呼ぶ。入力は現在の PR 本文文字列。

```
Skill invoke: use-workflow-pageshot
Input: <PR body string>
```

呼び出し前に PR 本文に必要なもの:

- 上部近くに `Preview URL: <URL>` 行
- `## How to Test` セクション (番号付きリスト)

skill は stdout に 1 行返す:

```
mode=screenshot artifact=/path/to/step-01.png
```

または

```
mode=video artifact=/path/to/capture.mp4
```

`mode=failed` のとき、欠落項目を報告して PR 作成を続行する (pageshot をスキップ)。

PR 作成後、以下を表示:

```text
Pageshot generated: <absolute path>
Drag and drop it into the PR description or first comment on GitHub.
```

## Prose Review

### 構造 (PR 固有)

| チェック       | 質問                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| Why stated     | 変更理由 (何でなく) が冒頭 1-3 行にあるか                                |
| Test evidence  | 検証が具体的か (実行コマンド、テストファイル、スクリーンショット)        |
| Scope          | 変更が集中しているか、無関係な編集が混ざっていないか                     |
| Reviewer focus | レビュー優先度が明確か ("focus on X", "skim Y")                          |
| Risk surfaced  | マイグレーション、ロールバック、パフォーマンスのリスクが明示されているか |

### Anti-AI-pattern

| パターン           | シグナル                                                                        | 修正                               |
| ------------------ | ------------------------------------------------------------------------------- | ---------------------------------- |
| Boilerplate opener | `This PR introduces/implements/adds...`                                         | 解決した問題やアウトカムから始める |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                               | 削除するか具体 (件数、名前) に置換 |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                             | `use`, `do`, `let` を使う          |
| Vague quantifier   | `various changes`, `multiple improvements`, `several fixes`                     | 列挙するか件数を示す               |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                            | hedge は最大 1 つ、または断言する  |
| Filler phrase      | `It should be noted that...`, `Happy to discuss`, `Looking forward to thoughts` | 削除。事実を述べるか直接尋ねる     |

### Push (手動)

`git push` を直接実行しない。コマンドを表示して確認を待つ:

```text
Run this to push: git push -u origin HEAD
```

## エラー処理

| エラー               | 動作                    |
| -------------------- | ----------------------- |
| commit なし          | "No commits" を報告     |
| base ブランチなし    | main をデフォルトとする |
| Git リポジトリでない | "Not a git repo" を報告 |
| gh 認証失敗          | 認証エラーを報告        |

## ルール

| ルール             | 詳細                                     |
| ------------------ | ---------------------------------------- |
| Title: prefix なし | `feat:`, `fix:`, `refactor:` などなし    |
| Body: 直接文字列   | heredoc (`<<EOF`) を避ける、sandbox 制約 |

## 表示形式

プレビューはタイトル、base ブランチ、現在ブランチ、サマリー bullets、変更テーブルを表示。成功時: `Created PR: #<number> <title> <PR URL>`
