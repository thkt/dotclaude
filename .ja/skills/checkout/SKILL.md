---
name: checkout
description: Git の変更を解析し、適切なブランチ名を提案する。
when_to_use: ブランチ名, ブランチ作成, branch name
allowed-tools: Bash(git:*) AskUserQuestion
model: haiku
argument-hint: "[context or ticket number]"
---

# /checkout - Git Branch Name Generator

## Input

- コンテキストまたはチケット番号: `$ARGUMENTS` (任意)
- `$ARGUMENTS` が空 → git diff/status のみで解析

## Execution

| Step | アクション                                       |
| ---- | ------------------------------------------------ |
| 1    | 変更を読む: `git status`, `git diff` (並列)      |
| 2    | ブランチ名候補を 3 つ生成 (Branch Naming を参照) |
| 3    | `AskUserQuestion` で理由付き選択肢を提示         |
| 4    | `git checkout -b` で選んだブランチを作成         |

## Branch Naming

| Prefix    | ユースケース    | トリガー                     |
| --------- | --------------- | ---------------------------- |
| feature/  | 新機能          | 新規ファイル、コンポーネント |
| fix/      | バグ修正        | エラー修正                   |
| refactor/ | コード改善      | 再構造化                     |
| docs/     | ドキュメント    | .md ファイル、README         |
| test/     | テスト追加/修正 | テストファイル               |
| chore/    | メンテナンス    | 依存、設定                   |
| perf/     | パフォーマンス  | 最適化、キャッシュ           |

## Format

```text
<type>/<scope>-<description>
<type>/<ticket>-<description>
```

| Good                             | Bad                         |
| -------------------------------- | --------------------------- |
| `feature/auth-add-oauth-support` | `new-feature` (type なし)   |
| `fix/api-resolve-timeout-issue`  | `feature/ADD_USER` (大文字) |
| `feature/PROJ-123-user-search`   | `fix/bug` (曖昧すぎる)      |

## Rules

| Do                     | Don't                       |
| ---------------------- | --------------------------- |
| 小文字を使う           | 空白/アンダースコアを使う   |
| ハイフンを区切りに使う | CamelCase/PascalCase を使う |
| 簡潔に (2-4 単語)      | 曖昧な名前 ("update")       |
| チケット ID を含める   | 日付を含める                |

## Error Handling

| エラー               | アクション              |
| -------------------- | ----------------------- |
| 変更なし             | "No changes" を報告     |
| ブランチ既存         | 代替名を提案            |
| git リポジトリでない | "Not a git repo" を報告 |

## Display Format

### Success

Created branch: `[selected-branch-name]`
