---
description: ブランチの変更を分析し、包括的なPR説明を生成。ユーザーがPR作って, プルリクエスト, pull request, PR作成等に言及した場合に使用。
allowed-tools: Bash(git:*), Bash(gh:*), Task, AskUserQuestion
model: opus
argument-hint: "[Issue参照またはコンテキスト]"
---

# /pr - プルリクエスト説明生成

現在のブランチのすべての変更を分析し、包括的なPR説明を生成。

## 入力

- Issue参照またはコンテキスト: `$1`（任意、例: `#456`）
- `$1`が空の場合 → 現在のブランチから生成

## Agent

| タイプ | 名前         | 目的              |
| ------ | ------------ | ----------------- |
| Agent  | pr-generator | PR説明生成 (fork) |

## 実行

| Step | アクション                                                  |
| ---- | ----------------------------------------------------------- |
| 1    | 分析: `git status`, `git diff`, `git log`（並行）           |
| 2    | AskUserQuestionでbaseブランチを選択                         |
| 3    | `Task`で`subagent_type: pr-generator`によるPRコンテンツ生成 |
| 4    | PRプレビュー → AskUserQuestion: "このPRを作成しますか?"     |
| 5    | pushコマンドを表示（ユーザーが手動実行）                    |
| 6    | PR作成: `gh pr create --title "..." --body "..."`           |

### Baseブランチ選択（Step 2）

| 質問         | 選択肢                    |
| ------------ | ------------------------- |
| Baseブランチ | main / develop / [検出値] |

### PR確認（Step 4）

プレビュー → AskUserQuestion: "このPRを作成しますか?"

### Push（手動）

`git push` を直接実行しない。コマンドを表示して確認を待つ:

```text
実行してください: git push -u origin HEAD
```

## ルール

| ルール               | 詳細                                                 |
| -------------------- | ---------------------------------------------------- |
| タイトル: 接頭辞なし | `feat:`, `fix:`, `refactor:`等は付けない             |
| 本文: 直接文字列     | ヒアドキュメント（`<<EOF`）回避 - サンドボックス制限 |

## 表示形式

プレビューはタイトル、baseブランチ、現在のブランチ、概要箇条書き、変更テーブルを表示。
成功: `**PR作成完了**: #<number> <title> <PR URL>`

## 検証

| チェック                                            | 必須 |
| --------------------------------------------------- | ---- |
| `Task`で`subagent_type: pr-generator`を呼び出した？ | Yes  |
| タイトルに接頭辞なし（`feat:`, `fix:`等）？         | Yes  |
