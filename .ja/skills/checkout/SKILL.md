---
name: checkout
description: Git変更を分析し、適切なブランチ名を提案。
when_to_use: ブランチ名, ブランチ作成, branch name
allowed-tools: Bash(git:*) AskUserQuestion
model: haiku
argument-hint: "[コンテキストまたはチケット番号]"
---

# /checkout - Gitブランチ名生成

## 入力

- コンテキストまたはチケット番号: `$ARGUMENTS`（任意）
- `$ARGUMENTS`が空の場合 → git diff/status のみ分析

## 実行

| Step | アクション                                          |
| ---- | --------------------------------------------------- |
| 1    | 変更を読み込み: `git status`, `git diff`（並行）    |
| 2    | 3つのブランチ名候補を生成（ブランチ命名 参照）      |
| 3    | `AskUserQuestion`で選択肢を理由付きで提示           |
| 4    | `git checkout -b` で選択されたブランチを作成        |

## ブランチ命名

| Prefix      | 用途             | トリガー                     |
| ----------- | ---------------- | ---------------------------- |
| `feature/`  | 新機能           | 新規ファイル、コンポーネント |
| `fix/`      | バグ修正         | エラー修正                   |
| `refactor/` | コード改善       | 構造変更                     |
| `docs/`     | ドキュメント     | .md, README                  |
| `test/`     | テスト追加・修正 | テストファイル               |
| `chore/`    | メンテナンス     | 依存・設定                   |
| `perf/`     | パフォーマンス   | 最適化、キャッシュ           |

## フォーマット

```text
<type>/<scope>-<description>
<type>/<ticket>-<description>
```

| Good                             | Bad                         |
| -------------------------------- | --------------------------- |
| `feature/auth-add-oauth-support` | `new-feature` (typeなし)    |
| `fix/api-resolve-timeout-issue`  | `feature/ADD_USER` (大文字) |
| `feature/PROJ-123-user-search`   | `fix/bug` (曖昧すぎる)      |

## ルール

| Do                     | Don't                         |
| ---------------------- | ----------------------------- |
| 小文字を使う           | スペース・アンダースコア使用  |
| ハイフンを区切り文字に | CamelCase/PascalCase使用      |
| 簡潔に（2-4語）        | 曖昧な名前（「update」など）  |
| チケットIDを含める     | 日付を含める                  |

## エラー処理

| エラー              | アクション                     |
| ------------------- | ------------------------------ |
| 変更なし            | "変更なし" を報告              |
| ブランチが存在      | 別の名前を提案                 |
| Gitリポジトリでない | "Gitリポジトリではない" を報告 |

## 表示形式

### 成功

ブランチ作成完了: `[選択されたブランチ名]`
