---
description: 外部視点分析のためにCodeRabbit AIコードレビューを実行
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: opus
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
dependencies: [utilizing-cli-tools]
---

# /rabbit - CodeRabbit AIレビュー

CodeRabbit CLIで外部AIコードレビューを実行。

## 入力

- 引数なし: すべての変更をレビュー
- `--base <branch>`: 特定ブランチと比較
- `--type`: `all`, `committed`, `uncommitted`

## 実行

**重要**: TTYサポートに`dangerouslyDisableSandbox: true`が必要。

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true,
});
```

### スコープベース実行

| スコープ      | 時間    | モード             |
| ------------- | ------- | ------------------ |
| < 10ファイル  | 10-30秒 | インライン         |
| 10-50ファイル | 1-5分   | バックグラウンド可 |
| 50+ファイル   | 7-30+分 | バックグラウンド   |

## 出力

```markdown
## CodeRabbitレビュー

| 指標     | 値              |
| -------- | --------------- |
| ファイル | X               |
| 問題数   | X               |
| 深刻度   | High/Medium/Low |

### 検出された問題

| ファイル    | 行  | 問題   | 深刻度 |
| ----------- | --- | ------ | ------ |
| src/auth.ts | 42  | [説明] | High   |

### 推奨事項

[実行可能な提案]
```

## エラーハンドリング

| エラー                | アクション              |
| --------------------- | ----------------------- |
| gitリポジトリではない | `git init`を提案        |
| 認証が必要            | `coderabbit auth login` |
| 変更なし              | "レビューするものなし"  |
