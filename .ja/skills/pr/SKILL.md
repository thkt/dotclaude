---
name: pr
description: ブランチの変更を分析しPR説明を生成。
when_to_use: PR作って, プルリクエスト, pull request, PR作成
allowed-tools: Bash(git:*) Bash(gh:*) Read AskUserQuestion Skill
model: sonnet
argument-hint: "[Issue参照またはコンテキスト]"
---

# /pr - プルリクエスト説明生成

## 入力

- Issue参照またはコンテキスト: `$ARGUMENTS`（任意、例: `#456`）
- `$ARGUMENTS`が空の場合 → 現在のブランチから生成

## 実行

| Step | アクション                                                                                |
| ---- | ----------------------------------------------------------------------------------------- |
| 1    | 分析: `git status`, `git diff <base>...HEAD`, `git log <base>..HEAD`（並行）              |
| 2    | ベースブランチ検出（下記参照）                                                            |
| 3    | AskUserQuestionでベースブランチを選択（main / develop / [検出値]）                        |
| 4    | UI変更検出（下記参照）                                                                    |
| 5    | PRテンプレートに従いタイトル + 本文を生成（下記参照）                                     |
| 6    | 文章レビュー（下記参照）で本文をインラインで修正                                          |
| 7    | PRプレビュー → AskUserQuestion: "このPRを作成しますか?"                                   |
| 8    | UI変更あり: Skill invoke `use-workflow-pageshot` にPR本文を渡す（下記参照）               |
| 9    | pushコマンドを表示（手動実行）                                                            |
| 10   | PR作成: `gh pr create --title "..." --body "..."`                                         |
| 11   | pageshot成果物あり: 成果物パス + 手動貼り付け案内を表示                                   |

## 分析ソース

| カテゴリ | ソース                   |
| -------- | ------------------------ |
| 変更     | `git diff <base>...HEAD` |
| コミット | `git log <base>..HEAD`   |
| ファイル | `git diff --name-status` |

## 変更タイプ検出

| タイプ   | キーワード                      |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## 言語

`~/.claude/settings.json` の `language` を読み、PR本文をその言語に翻訳する。未設定なら英語をデフォルトとする。技術用語・コード・識別子は翻訳しない。

## タイトルルール

| ルール        | フォーマット                                         |
| ------------- | ---------------------------------------------------- |
| 接頭辞        | なし（`feat:`, `fix:` 等は付けない）                 |
| Issue参照あり | Issueタイトルをそのまま使用                          |
| Issueなし     | 命令形動詞 + 説明（72文字以下）                      |
| 例            | `Add user authentication`, `Fix login timeout issue` |

## PRテンプレート

${CLAUDE_SKILL_DIR}/templates/pr.md

### Design Decisions の抽出

`Design Decisions` セクションをコミット単位ではなくPR単位で集約する。`git diff <base>...HEAD` と `git log <base>..HEAD` から以下を読み取って記載する。

| シグナル                                 | 記載例                          |
| ---------------------------------------- | ------------------------------- |
| 同等の選択肢があり明示的に一方を選んだ   | "X を Y より採用。理由は..."    |
| パフォーマンス・型・互換性のトレードオフ | "Y を回避するため X を選択"     |
| 既存パターンからの逸脱                   | "X から逸脱。理由は..."         |
| ライブラリ・API選定                      | "X を選定（Y より）。理由は..." |

定型実装のみ（明示的なトレードオフなし）→ Design Decisions セクションを省略する。

## ベースブランチ検出

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# Fallback: main → master → develop
```

## UI変更検出

`git diff --name-only {base}...HEAD` に次の拡張子が含まれる場合はUI変更。

| 拡張子                                          | 種類           |
| ----------------------------------------------- | -------------- |
| `.tsx` / `.jsx` / `.vue` / `.svelte` / `.astro` | コンポーネント |
| `.html`                                         | ページ         |
| `.css` / `.scss` / `.sass` / `.less`            | スタイル       |
| `*.module.css` / `*.module.scss`                | CSSモジュール  |

UI変更なし → Pageshot連携をスキップ。

## Pageshot連携

`use-workflow-pageshot` skill を Skill ツールで呼び出す。入力は現在のPR本文文字列。

```
Skill invoke: use-workflow-pageshot
Input: <PR本文文字列>
```

呼び出し前のPR本文必須要件:

- 先頭近くに `Preview URL: <URL>` 行
- `## How to Test` セクション（番号付きリスト）

skillはstdoutで1行を返す:

```
mode=screenshot artifact=/path/to/step-01.png
```

または

```
mode=video artifact=/path/to/capture.mp4
```

`mode=failed` の場合は欠落項目を報告し、PR作成は続行（pageshotスキップ）。

PR作成後の表示:

```text
Pageshot 生成完了: <絶対パス>
GitHub の PR 説明文または最初のコメント欄にドラッグ&ドロップで貼り付けてください。
```

## 文章レビュー

### 構造（PR向け）

| チェック項目 | 問い                                                               |
| ------------ | ------------------------------------------------------------------ |
| Why の明示   | 変更理由（何をではなく、なぜ）が冒頭1〜3行にあるか                 |
| 検証の具体   | 確認方法が具体的か（実行コマンド・テストファイル・スクショリンク） |
| スコープ     | 変更が1つに絞られているか。関係ない編集を混ぜていないか            |
| レビュー観点 | どこを重点的に見てほしいか明示されているか                         |
| リスクの明示 | マイグレーション・ロールバック・性能のリスクが明記されているか     |

### AIパターン検出

| パターン           | シグナル                                                                        | 修正                                   |
| ------------------ | ------------------------------------------------------------------------------- | -------------------------------------- |
| Boilerplate opener | `This PR introduces/implements/adds...`                                         | 解決した問題や結果から書き始める       |
| Empty intensifier  | `comprehensive`, `robust`, `seamless`, `thorough`                               | 削除または具体（件数・名称）に置換     |
| Filler verb        | `leverage`, `utilize`, `facilitate`                                             | `use`, `do`, `let` を使う              |
| Vague quantifier   | `various changes`, `multiple improvements`, `several fixes`                     | 列挙するか数える                       |
| Hedge stacking     | `might potentially`, `could possibly`, `may perhaps`                            | ヘッジは1回まで、または断言            |
| Filler phrase      | `It should be noted that...`, `Happy to discuss`, `Looking forward to thoughts` | 削除。事実を述べるか、具体的に依頼する |

### Push（手動）

`git push` を直接実行しない。コマンドを表示して確認を待つ:

```text
実行してください: git push -u origin HEAD
```

## エラー処理

| エラー              | アクション                     |
| ------------------- | ------------------------------ |
| コミットなし        | "No commits" を報告            |
| ベースブランチなし  | main をデフォルトに            |
| Gitリポジトリでない | "Gitリポジトリではない" を報告 |
| gh認証失敗          | 認証エラーを報告               |

## ルール

| ルール               | 詳細                                                 |
| -------------------- | ---------------------------------------------------- |
| タイトル: 接頭辞なし | `feat:`, `fix:`, `refactor:` 等は付けない            |
| 本文: 直接文字列     | ヒアドキュメント（`<<EOF`）回避 - サンドボックス制限 |

## 表示形式

プレビューはタイトル、ベースブランチ、現在のブランチ、概要箇条書き、変更テーブルを表示。成功: `PR作成完了: #<number> <title> <PR URL>`
