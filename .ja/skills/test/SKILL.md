---
name: test
description: プロジェクトテストを実行しコード品質を検証。ユーザーがテスト実行, テスト走らせて, run tests, テストして等に言及した場合に使用。
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, Task, AskUserQuestion
model: opus
argument-hint: "[テストスコープまたは特定のテスト]"
user-invocable: true
---

# /test - テスト実行＆品質検証

ギャップ分析と品質チェック付きでプロジェクトテストを実行。

## 入力

- テストスコープまたはファイルパターン: `$1`（任意）
- `$1`が空の場合 → AskUserQuestionでスコープを選択

### スコープ選択

| 質問     | 選択肢                         |
| -------- | ------------------------------ |
| スコープ | all / unit / integration / e2e |

## Agent

| タイプ | 名前           | 目的                |
| ------ | -------------- | ------------------- |
| Agent  | test-generator | ギャップ分析 (fork) |

## 実行

| Step | アクション                                                |
| ---- | --------------------------------------------------------- |
| 1    | テスト実行（npm/yarn/pnpm/bun）                           |
| 2    | カバレッジ分析                                            |
| 3    | `Task`で`subagent_type: test-generator`によるギャップ分析 |
| 4    | 品質チェック（lint, type-check）                          |

## 表示形式

### 結果

```markdown
## 🧪 テスト結果

| メトリクス | 値   |
| ---------- | ---- |
| Total      | XX   |
| Passed     | XX   |
| Failed     | XX   |
| Coverage   | XX%  |
| Time       | X.Xs |

### 特定されたギャップ

[ある場合]
```

### 成功

**テスト**: ✅ XX passed | ❌ XX failed | Coverage XX%

## エスカレーション

| 条件                   | 提案                            |
| ---------------------- | ------------------------------- |
| テスト失敗             | `/fix` で回帰テスト付きバグ修正 |
| カバレッジギャップ発見 | `/code` でTDDによるテスト追加   |
| 複数の失敗             | `/research` で根本原因を調査    |

## 検証

| チェック                                              | 必須 |
| ----------------------------------------------------- | ---- |
| `Task`で`subagent_type: test-generator`を呼び出した？ | Yes  |
