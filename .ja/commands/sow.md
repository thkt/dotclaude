---
description: 複雑なタスクの計画のためにStatement of Work（SOW）を生成。ユーザーがSOW作成, 要件定義, 作業計画等に言及した場合に使用。
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

テンプレートでSOWを生成（ID形式: AC-N で受入基準を記述）。

テンプレート: [@../../templates/sow/template.md](../../templates/sow/template.md)

## 出力

このパスを正確に使用すること — Write ツールが親ディレクトリを自動作成する。

ファイル: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`
