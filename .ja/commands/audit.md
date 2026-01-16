---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
---

# /audit - コードレビューオーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 引数: 対象スコープ（任意）
- 未指定時: ステージ済み/変更ファイルをレビュー（`git diff --name-only`経由）

## 実行

`audit-orchestrator`サブエージェントに委譲（15エージェント: コア8 + pr-review-toolkit 4 + 本番用3）。

## フロー

```text
[reviewers] → [orchestrator] → [integrator YAML] → [command formats]
```

## 出力

```markdown
# レビューサマリー

- 発見事項: {summary.total_findings} | Critical {summary.by_severity.critical} / High {summary.by_severity.high} / Medium {summary.by_severity.medium}

## 重大な問題

{priorities[priority=critical].item} - {priorities[priority=critical].action}

## 検出パターン

{patterns[].name}: {patterns[].root_cause}

## 推奨アクション

1. [✓] 即時: {priorities[timing=immediate].action}
2. [→] 今スプリント: {priorities[timing=this_sprint].action}
```

## IDR

- IDRあり: `/audit`セクションを追記（レビューサマリー、問題、推奨事項）
- IDRなし: スキップ（ターミナル出力のみ）
