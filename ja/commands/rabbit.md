---
description: 外部AI視点による CodeRabbit AI コードレビューを実行
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: inherit
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
---

# /rabbit - CodeRabbit AI レビュー

## 目的

CodeRabbit CLI を使用して外部 AI コードレビューを実行します。独立した AI システムによるセカンドオピニオンを提供します。

## 使用タイミング

| `/rabbit` を使う | 他のコマンドを使う |
|-----------------|-------------------|
| クイック外部レビュー | 包括的レビュー → `/audit` |
| コミット/PR 前 | アーキテクチャレビュー → `/audit` |
| セカンドオピニオンが必要 | 内部パターンチェック → `/audit` |
| 特定ブランチとの差分 | プロジェクトルール準拠 → `/audit` |

## /audit との比較

| 観点 | `/rabbit` | `/audit` |
|------|-----------|----------|
| ソース | 外部 AI (CodeRabbit) | 内部エージェント |
| 速度 | 高速 (10-30秒) | 低速 (マルチエージェント) |
| フォーカス | 一般的なコード品質 | プロジェクト固有ルール |
| 最適な用途 | クイックサニティチェック | 包括的レビュー |

## 使用方法

### 基本（未コミット + 最近のコミット）

```bash
/rabbit
```

### 特定ブランチとの比較

```bash
/rabbit --base main
```

### 未コミットの変更のみ

```bash
/rabbit --type uncommitted
```

### カスタム設定ファイル

```bash
/rabbit --config CLAUDE.md
```

## サンドボックス要件

**重要**: CodeRabbit CLI はターミナル UI (Ink フレームワーク) のために TTY/Raw mode を必要とします。

`coderabbit review` を実行する際は、Bash ツール呼び出しで必ず `dangerouslyDisableSandbox: true` を指定してください：

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true  // TTY サポートに必要
})
```

**理由**: サンドボックス環境は非 TTY の stdin を提供するため、以下の問題が発生します：

- "Raw mode is not supported" エラー
- "Connecting to review service" でハング

## 実行手順

### Step 1: Git 状態確認

```bash
!`git status --short | head -10`
```

### Step 2: CodeRabbit レビュー実行

適切なオプションで CodeRabbit を実行：

```bash
# デフォルト: 全変更をレビュー
coderabbit review --prompt-only

# ベースブランチ指定時
coderabbit review --prompt-only --base <branch>

# タイプフィルタ指定時
coderabbit review --prompt-only --type <type>
```

### Step 3: 結果の解析と表示

出力を読みやすく整形：

```markdown
## 🐰 CodeRabbit レビュー結果

### 検出された問題

| ファイル | 行 | 種類 | 説明 |
|---------|-----|------|------|
| ... | ... | ... | ... |

### サマリー

- 総問題数: X
- 種類別: refactor (N), potential_issue (N), ...

### 推奨アクション

1. [優先対応すべき問題]
2. [オプションの改善]
```

### Step 4: 次のステップを提案

```markdown
---
📋 次のステップ:
- 修正を適用: `/fix` で個別問題に対応
- 完全レビュー: `/audit` で包括的分析
- コミット: `/commit` 問題が許容範囲なら
```

## 出力形式

**問題なしの場合**:

```text
✅ CodeRabbit: 問題は検出されませんでした
```

**問題ありの場合**:

```text
🐰 CodeRabbit が N 件の問題を検出:

📁 path/to/file.ts
  L42 [refactor] 提案の説明
  L78 [issue] 潜在的問題の説明

📁 another/file.ts
  L15 [refactor] 別の提案

💡 `/fix` を実行してこれらの問題に対応してください
```

## エラーハンドリング

| エラー | アクション |
|--------|----------|
| Git リポジトリでない | エラー表示、`git init` を提案 |
| レビュー対象なし | "レビュー対象がありません" を表示 |
| 認証が必要 | `coderabbit auth login` を提案 |
| ネットワークエラー | 1回リトライ後、エラー表示 |

## ワークフロー統合

```text
開発フロー:
  /code → /rabbit → /fix (必要なら) → /commit

PR フロー:
  /rabbit --base main → /audit → /pr
```
