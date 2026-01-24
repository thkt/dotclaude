---
description: プロジェクトテストを実行し、包括的なテストを通じてコード品質を検証
allowed-tools: Bash(npm test), Bash(npm run), Bash(yarn test), Bash(yarn run), Bash(pnpm test), Bash(pnpm run), Bash(bun test), Bash(bun run), Bash(npx), Read, Glob, Grep, TodoWrite, Task
model: opus
argument-hint: "[テストスコープまたは特定のテスト]"
---

# /test - テスト実行＆品質検証

ギャップ分析と品質チェック付きでプロジェクトテストを実行。

## 入力

- テストスコープまたはファイルパターン: `$1`（任意）
- `$1`が空の場合 → 全テストを実行

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

## フロー: Execute

```text
[実行] → [結果]
```

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

## 検証

| チェック                                              | 必須 |
| ----------------------------------------------------- | ---- |
| `Task`で`subagent_type: test-generator`を呼び出した？ | Yes  |
