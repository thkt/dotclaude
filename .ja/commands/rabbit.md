---
description: 外部視点分析のためにCodeRabbit AIコードレビューを実行
allowed-tools: Bash(coderabbit:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read, Glob
model: inherit
argument-hint: "[--base <branch>] [--type <all|committed|uncommitted>]"
dependencies: [utilizing-cli-tools]
---

# /rabbit - CodeRabbit AIレビュー

## 目的

外部AIコードレビューのためにCodeRabbit CLIを実行。異なる分析パターンを持つ独立したAIシステムからのセカンドオピニオンを提供。

## 認証（推奨）

強化されたレビューのために、まず認証:

```bash
coderabbit auth login
```

**認証のメリット:**

- チーム学習がレビューに適用
- 完全なコンテキスト分析
- チーム標準の強制
- パーソナライズされた推奨

問題が発生した場合はエラーハンドリングセクションで認証状態を確認。

## 使用タイミング

| `/rabbit`を使用 | 他のコマンドを使用 |
| --- | --- |
| 素早い外部レビュー | 包括的レビュー → `/audit` |
| コミット/PR前 | アーキテクチャレビュー → `/audit` |
| セカンドオピニオンが必要 | 内部パターンチェック → `/audit` |
| 特定ブランチのdiff | プロジェクトルール準拠 → `/audit` |

## /auditとの比較

| 観点 | `/rabbit` | `/audit` |
| --- | --- | --- |
| ソース | 外部AI（CodeRabbit） | 内部エージェント |
| 速度 | 高速（10-30秒） | 低速（マルチエージェント） |
| フォーカス | 一般的なコード品質 | プロジェクト固有のルール |
| 最適な用途 | クイックサニティチェック | 包括的レビュー |

## 実行時間

レビュー時間はスコープにより変動:

| スコープ | 時間 | 推奨 |
| --- | --- | --- |
| 小（< 10ファイル） | 10-30秒 | インラインで実行 |
| 中（10-50ファイル） | 1-5分 | インラインまたはバックグラウンド |
| 大（50+ファイル） | 7-30+分 | **バックグラウンドで実行** |

大規模レビューでは、AIエージェントにCodeRabbitをバックグラウンドで実行させ、後で確認。

## AIエージェントのベストプラクティス

AIエージェント（Claude Code、Cursor等）で`/rabbit`を使用する場合:

1. **ループ制限**: 無限修正ループを防ぐため2-3レビューサイクルに制限
2. **大規模PRはバックグラウンド**: 50+ファイル変更には`run_in_background: true`を使用
3. **完璧を求めない**: クリティカルな問題を修正、マイナーな提案はそのまま受け入れ

```markdown
推奨ワークフロー:
/rabbit → /fix（クリティカルのみ） → /rabbit（検証） → /commit

非推奨:
/rabbit → /fix → /rabbit → /fix → /rabbit → ...（無限ループ）
```

## 使用方法

### 基本（未コミット + 最近のコミットをレビュー）

```bash
/rabbit
```

### 特定ブランチに対してレビュー

```bash
/rabbit --base main
```

### 未コミットの変更のみレビュー

```bash
/rabbit --type uncommitted
```

### カスタム設定でレビュー

```bash
/rabbit --config CLAUDE.md
```

## サンドボックス要件

**重要**: CodeRabbit CLIはターミナルUI（Inkフレームワーク）のためにTTY/Rawモードが必要。

`coderabbit review`実行時、Bashツール呼び出しで`dangerouslyDisableSandbox: true`を使用必須:

```typescript
Bash({
  command: "coderabbit review --prompt-only",
  dangerouslyDisableSandbox: true  // TTYサポートに必要
})
```

**理由**: サンドボックス環境は非TTY stdinを提供し、以下を引き起こす:

- "Raw mode is not supported"エラー
- "Connecting to review service"でハング

## 実行

### ステップ1: Git状態を確認

```bash
!`git status --short | head -10`
```

### ステップ2: CodeRabbitレビューを実行

適切なオプションでCodeRabbitを実行:

```bash
# デフォルト: すべての変更をレビュー
coderabbit review --prompt-only

# baseブランチ指定（指定された場合）
coderabbit review --prompt-only --base <branch>

# typeフィルター指定（指定された場合）
coderabbit review --prompt-only --type <type>
```

### ステップ3: 結果を解析・表示

出力を読みやすくフォーマット:

```markdown
## 🐰 CodeRabbitレビュー結果

### 検出された問題

| ファイル | 行 | タイプ | 説明 |
|------|------|------|-------------|
| ... | ... | ... | ... |

### サマリー

- 総問題数: X
- タイプ別: refactor (N), potential_issue (N), ...

### 推奨アクション

1. [優先的に対処すべき問題]
2. [オプションの改善]
```

### ステップ4: 次のステップを提案

```markdown
---
📋 次のステップ:
- 修正を適用: `/fix`で特定の問題に対処
- 完全レビュー: `/audit`で包括的分析
- コミット: `/commit`（問題が許容可能な場合）
```

## 出力フォーマット

**最小（問題なし）**:

```text
✅ CodeRabbit: 問題は見つかりませんでした
```

**問題あり**:

```text
🐰 CodeRabbitがN個の問題を検出:

📁 path/to/file.ts
  L42 [refactor] 提案の説明
  L78 [issue] 潜在的な問題の説明

📁 another/file.ts
  L15 [refactor] 別の提案

💡 `/fix`を実行してこれらの問題に対処
```

## エラーハンドリング

| エラー | アクション |
| --- | --- |
| gitリポジトリではない | エラー表示、`git init`を提案 |
| レビューする変更がない | "レビューするものがありません"を表示 |
| 認証が必要 | `coderabbit auth login`を提案 |
| ネットワークエラー | 1回リトライ、その後エラー表示 |

## ワークフローとの統合

```text
開発フロー:
  /code → /rabbit → /fix（必要に応じて） → /commit

PRフロー:
  /rabbit --base main → /audit → /pr
```
