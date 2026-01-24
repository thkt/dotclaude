---
description: 徹底的かつ包括的なコード品質評価のために専門レビューエージェントをオーケストレート
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Bash(ls:*), Bash(date:*), Bash(mkdir:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[対象ファイルまたはスコープ]"
---

# /audit - 徹底的コード監査オーケストレーター

徹底的な監査のために信頼度ベースフィルタリングで専門レビューエージェントをオーケストレート。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → ステージ済み/変更ファイルをレビュー（`git diff --name-only`経由）

## 実行

| Step | アクション                                                        |
| ---- | ----------------------------------------------------------------- |
| 1    | `Task`で`subagent_type: audit-orchestrator`                       |
| 2    | オーケストレーターがエージェント実行（audit-orchestrator.md参照） |
| 3    | インテグレーターが結果を構造化出力に集約                          |
| 4    | スナップショット保存（下記の命名規則参照）                        |
| 5    | 前回スナップショットと比較、差分を表示                            |
| 6    | テンプレートを使用してレポート出力                                |

## スナップショット命名規則

```bash
SNAPSHOT="$HOME/.claude/workspace/history/audit-$(date -u +%Y-%m-%d-%H%M%S).yaml"
```

出力例: `audit-2026-01-23-031812.yaml`

## テンプレート

| テンプレート                        | 目的                     |
| ----------------------------------- | ------------------------ |
| [@../templates/audit/output.md]     | 差分付き出力形式         |
| [@../templates/audit/snapshot.yaml] | スナップショットスキーマ |

## 検証

| チェック                                                  | 必須 |
| --------------------------------------------------------- | ---- |
| `Task`で`subagent_type: audit-orchestrator`を呼び出した？ | Yes  |
| スナップショットを保存した？                              | Yes  |
| 差分比較を表示した？                                      | Yes  |
