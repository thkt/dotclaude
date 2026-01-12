---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
dependencies: [audit-orchestrator, orchestrating-workflows]
---

# /audit - コードレビューオーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 引数: 対象スコープ（任意）
- 未指定時: ステージ済み/変更ファイルをレビュー（`git diff --name-only`経由）

## 実行

`audit-orchestrator`サブエージェントに委譲（15エージェント: コア8 + pr-review-toolkit 4 + 本番用3）。

## 出力

```markdown
# レビューサマリー

- ファイル: [件数] | Critical [X] / High [X] / Medium [X]

## 重大な問題

[file:line付き問題]

## 中程度の優先度

[推論付き問題]

## 推奨アクション

1. 即時 [✓]
2. 次のスプリント [→]
```

## IDR

- IDRあり: `/audit`セクションを追記（レビューサマリー、問題、推奨事項）
- IDRなし: スキップ（ターミナル出力のみ）
