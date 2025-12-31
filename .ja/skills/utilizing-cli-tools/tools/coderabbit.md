# CodeRabbit CLI

コマンドラインからの外部AIコードレビュー。

## 概要

CodeRabbitは内部レビューエージェントから独立した「セカンドオピニオン」としてAIパワードのコードレビューを提供。

## インストール

```bash
npm install -g coderabbit
# または
brew install coderabbit
```

## 基本的な使い方

### 現在の変更をレビュー

```bash
# すべてのコミットされていない変更をレビュー
coderabbit review

# 特定のファイルをレビュー
coderabbit review src/components/Button.tsx

# 特定のベースに対してレビュー
coderabbit review --base main
```

### レビュータイプ

| コマンド | スコープ |
| --- | --- |
| `coderabbit review` | すべての変更 |
| `coderabbit review --type committed` | コミット済み変更のみ |
| `coderabbit review --type uncommitted` | 未コミット変更のみ |
| `coderabbit review --type all` | コミット済みと未コミット両方 |

### 出力オプション

```bash
# Markdown出力
coderabbit review --format markdown

# JSON出力（パース用）
coderabbit review --format json

# 詳細出力
coderabbit review --verbose
```

## 一般的なワークフロー

### コミット前レビュー

```bash
git add -A
coderabbit review --type uncommitted
# 提案をレビューしてからコミット
```

### PR前レビュー

```bash
coderabbit review --base main
# PR作成前に問題を対処
```

### ベースブランチとの比較

```bash
coderabbit review --base origin/main --type committed
```

## レビューのフォーカス領域

CodeRabbitが分析する項目:

- **セキュリティ** - 脆弱性検出
- **パフォーマンス** - 非効率なパターン
- **ベストプラクティス** - コード品質問題
- **ロジックエラー** - 潜在的なバグ
- **スタイル** - 一貫性の問題

## コマンドとの統合

### /rabbitコマンド

`/rabbit` コマンドはCodeRabbit CLIをラップ:

```bash
/rabbit                    # すべての変更をレビュー
/rabbit --base develop     # developブランチに対して
/rabbit --type uncommitted # 未コミットのみ
```

### 使用タイミング

| 状況 | 推奨 |
| --- | --- |
| コミット前 | `coderabbit review --type uncommitted` |
| PR前 | `coderabbit review --base main` |
| クイックチェック | `/rabbit` |
| `/audit`後 | セカンドオピニオン |

## 出力の解釈

### 重大度レベル

| レベル | 意味 | アクション |
| --- | --- | --- |
| 🔴 Critical | セキュリティ/重大なバグ | 必須修正 |
| 🟠 High | 重要な問題 | 修正すべき |
| 🟡 Medium | 品質問題 | 修正を検討 |
| 🟢 Low | 提案 | オプション |

### 出力例

```markdown
## Security Issues (1)
🔴 SQL injection vulnerability in user.ts:42

## Performance (2)
🟠 N+1 query detected in posts.ts:78
🟡 Unnecessary re-render in Dashboard.tsx:23

## Best Practices (1)
🟢 Consider extracting magic number to constant
```

## ベストプラクティス

### 1. プッシュ前にレビュー

問題を早期にキャッチするため、プッシュ前に必ずCodeRabbitを実行。

### 2. /auditと組み合わせる

クイックな外部視点には `/rabbit`、包括的な内部レビューには `/audit` を使用。

### 3. クリティカルな問題に集中

進める前に 🔴 と 🟠 の問題に対処。

## 制限事項

- インターネット接続が必要
- レート制限がある可能性
- 結果はコードの複雑さにより異なる
- 人間のレビューの代替にはならない

## リファレンス

- CodeRabbitドキュメント: <https://coderabbit.ai/docs>
- `/rabbit` コマンド: このツールをAIレビューに使用
