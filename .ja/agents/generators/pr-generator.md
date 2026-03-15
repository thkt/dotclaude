---
name: pr-generator
description: ブランチ変更を分析し、包括的なPR説明を生成。
tools: [Bash]
model: sonnet
skills: [utilizing-cli-tools]
---

# PRジェネレーター

## 副作用

| 効果    | 説明                               |
| ------- | ---------------------------------- |
| Git読取 | `git diff`, `git log`（読取のみ）  |
| PR作成  | `gh pr create`（ユーザー確認必要） |

## 分析対象

| カテゴリ | ソース                   |
| -------- | ------------------------ |
| 変更     | `git diff main...HEAD`   |
| コミット | `git log main..HEAD`     |
| ファイル | `git diff --name-status` |

## 変更タイプ検出

| タイプ   | キーワード                      |
| -------- | ------------------------------- |
| Feature  | feat, add, new, implement       |
| Bug Fix  | fix, bug, issue, resolve        |
| Refactor | refactor, restructure, optimize |
| Docs     | docs, readme, documentation     |

## 言語

`~/.claude/settings.json` の `language`
を読み取り、PR本文をその言語に翻訳する。未設定の場合は英語をデフォルトとする。技術用語・コード・識別子は翻訳しない。

## タイトルルール

**接頭辞なし**（`feat:`, `fix:` 等は不要）

| コンテキスト  | フォーマット                |
| ------------- | --------------------------- |
| Issue参照あり | Issueタイトルをそのまま使用 |
| Issueなし     | 命令形動詞 + 説明 (≤72文字) |

例: `Add user authentication`, `Fix login timeout issue`

## PRテンプレート

[@../../../../.ja/templates/pr/default.md](../../../../.ja/templates/pr/default.md)

## ベースブランチ検出

```bash
BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
# フォールバック: main → master → develop
```

## エラーハンドリング

| エラー             | アクション              |
| ------------------ | ----------------------- |
| コミットなし       | "コミットなし"を報告    |
| ベースブランチなし | mainをデフォルト        |
| git リポジトリなし | "Not a git repo" を報告 |
| gh 認証失敗        | 認証エラーを報告        |

## 出力

構造化Markdownを返す:

```markdown
## Branch

| Field         | Value         |
| ------------- | ------------- |
| current       | branch-name   |
| base          | detected-base |
| commits       | count         |
| files_changed | count         |

## PR

| Field | Value                            |
| ----- | -------------------------------- |
| title | 接頭辞なし、命令形動詞           |
| body  | PRテンプレートの構造に従った内容 |

## Command

    gh pr create --title "title" --body "body"
```
