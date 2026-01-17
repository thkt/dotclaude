---
description: 包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
---

# /audit - コードレビューオーケストレーター

信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 引数: 対象スコープ（任意）
- 未指定時: ステージ済み/変更ファイルをレビュー（`git diff --name-only`経由）

## Agent

| タイプ | 名前               | 目的                                |
| ------ | ------------------ | ----------------------------------- |
| Agent  | audit-orchestrator | 17レビュアーオーケストレート (fork) |

## 実行

| Step | アクション                                                     |
| ---- | -------------------------------------------------------------- |
| 1    | `Task`で`subagent_type: audit-orchestrator`                    |
| 2    | オーケストレーターが17エージェント実行（ローカル13 + 外部4）   |
| 3    | インテグレーターが結果を構造化出力に集約                       |
| 4    | スナップショットを履歴に保存（スナップショットセクション参照） |
| 5    | 前回と比較して差分を表示                                       |

## フロー

```text
[reviewers] → [orchestrator] → [integrator] → [snapshot] → [diff] → [output]
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

## スナップショット

ディレクトリが存在しない場合は作成: `mkdir -p ~/.claude/workspace/history/`

サマリーを `~/.claude/workspace/history/audit-{timestamp}.yaml` に保存:

```yaml
meta:
  command: audit
  timestamp: { ISO 8601 }
  target: "{対象スコープ}"

summary:
  total_findings: { count }
  by_severity:
    critical: { count }
    high: { count }
    medium: { count }
    low: { count }
  patterns_count: { count }
  agents_reporting: { count }
```

**ファイル名形式**: `audit-YYYY-MM-DD-HHmmss.yaml`

## 差分比較

スナップショット保存後、直近の前回スナップショットと比較:

1. `~/.claude/workspace/history/audit-*.yaml` から最新ファイルを検索
2. `by_severity` の値を比較
3. 差分テーブルを表示

**警告閾値**: Critical または High が +1 以上増加した場合に警告。

```markdown
## 📊 Comparison with Previous ({previous_date})

| Severity | Previous | Current | Delta   |
| -------- | -------- | ------- | ------- |
| Critical | {n}      | {n}     | {diff}  |
| High     | {n}      | {n}     | ⚠️ +{n} |
| Medium   | {n}      | {n}     | {diff}  |
| Low      | {n}      | {n}     | {diff}  |

⚠️ High severity increased. Review recommended.
```

**前回スナップショットなし**: 差分スキップ、"First recording" メッセージを表示。

## 検証

| チェック                                                   | 必須 |
| ---------------------------------------------------------- | ---- |
| `Task`で`subagent_type: audit-orchestrator`を呼び出した？  | Yes  |
| スナップショットを `~/.claude/workspace/history/` に保存？ | Yes  |
| 差分比較を表示（前回が存在する場合）？                     | Yes  |
