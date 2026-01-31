---
description: 複雑なタスクの計画のためにStatement of Work（SOW）を生成
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[タスク説明]"
---

# /sow - SOWジェネレーター

計画と分析のためにsow.mdを生成。

## 入力

- タスク説明: `$1`（任意）
- `$1`が空の場合 → リサーチコンテキストを確認、なければAskUserQuestionで選択
- 解決順序: `$1` > リサーチコンテキスト (`*.md`) > AskUserQuestion

### 説明プロンプト

| 質問       | 選択肢            |
| ---------- | ----------------- |
| タスク説明 | [Otherで自由入力] |

## 実行

テンプレートでSOWを生成（ID形式: I-001, AC-001, R-001）。

テンプレート: [@../../templates/sow/template.md](../../templates/sow/template.md)

## 出力

ファイル: `$HOME/.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
