---
description: 複雑なタスクの計画のためにStatement of Work（SOW）を生成
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: opus
argument-hint: "[タスク説明]"
---

# /sow - SOWジェネレーター

計画と分析のためにsow.mdを生成。

## 入力

- 引数: タスク説明（任意）
- 未指定時: リサーチコンテキストを使用またはAskUserQuestionで確認

### 解決順序

1. 引数あり → タスク説明として使用
2. リサーチコンテキストあり → `.claude/workspace/research/*.md`を使用
3. なし → AskUserQuestionで確認

## 実行

テンプレートでSOWを生成（ID形式: I-001, AC-001, R-001）。

テンプレート: [@../../templates/sow/template.md](../../templates/sow/template.md)

## 出力

ファイル: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
