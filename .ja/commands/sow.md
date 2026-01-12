---
description: 複雑なタスクの計画のためにStatement of Work（SOW）を生成
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[タスク説明]"
dependencies: [formatting-audits, managing-planning]
---

# /sow - SOWジェネレーター

計画と分析のためにsow.mdを生成。

## 入力

- 引数: タスク説明（任意）
- 未指定時: リサーチコンテキストを使用またはAskUserQuestionで確認

### 解決順序

1. 引数あり → タスク説明として使用
2. リサーチコンテキストあり → `.claude/workspace/research/*-context.md`を使用
3. なし → AskUserQuestionで確認

## 実行

`managing-planning`スキルのテンプレート構造でSOWを生成（ID形式: I-001, AC-001, R-001）。

### 必須セクション

1. エグゼクティブサマリー
2. 問題分析
3. 前提条件と要件
4. ソリューション設計
5. テスト計画
6. 受け入れ基準
7. 実装計画（Progress Matrix含む）
8. 成功メトリクス
9. リスクと緩和策
10. 検証チェックリスト

## 出力

```text
.claude/workspace/planning/[timestamp]-[feature]/sow.md
```
