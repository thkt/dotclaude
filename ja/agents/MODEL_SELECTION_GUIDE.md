# Agent Model Selection Guide

## 選択基準

| 条件 | モデル | コスト | 速度 |
|------|--------|--------|------|
| 複数エージェント調整 | opus | High | Slow |
| 深いコンテキスト理解 | sonnet | Medium | Medium |
| パターンベースの処理 | haiku | Low | Fast |

## Decision Tree

```text
タスクが複数エージェントを調整する必要がある？
  YES → opus
  NO ↓
タスクが深いコンテキスト理解を必要とする？
  YES → sonnet
  NO ↓
タスクがパターンベースまたは定型的？
  YES → haiku
  NO → sonnet (default)
```

## 現在のAgent設定

### Reviewers (主にsonnet)

- performance-reviewer: sonnet - 複雑な最適化分析
- accessibility-reviewer: sonnet - WCAG準拠チェック
- readability-reviewer: haiku - パターンベースチェック
- type-safety-reviewer: sonnet - 型推論が必要

### Generators (主にhaiku)

- commit-generator: haiku - 定型的なメッセージ生成
- branch-generator: haiku - 命名規則に基づく生成
- test-generator: sonnet - コード理解が必要

### Orchestrators (opus)

- review-orchestrator: opus - 複数レビュアーの調整

## コスト見積もり

1000トークンあたり:

- haiku: ~$0.00025
- sonnet: ~$0.003
- opus: ~$0.015

## 新規Agent作成時の判断フロー

1. タスクの複雑さを評価
2. コンテキスト理解の必要性を判断
3. 上記Decision Treeに従ってモデル選択
4. 既存の類似Agentを参考に調整

## 関連ドキュメント

- [agents/README.md](./README.md) - ディレクトリ構造と作成手順
- [Skills README](../skills/README.md) - スキルとの連携
