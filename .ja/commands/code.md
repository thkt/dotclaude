---
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
dependencies:
  [
    generating-tdd-tests,
    applying-frontend-patterns,
    applying-code-principles,
    integrating-storybook,
    orchestrating-workflows,
    ralph-loop,
  ]
---

# /code - TDD実装

TDD/RGRCサイクルと品質チェックによるコード実装。

## 入力

- 引数: 実装の説明（必須）
- 未指定時: AskUserQuestionで確認
- フラグ: `--frontend`, `--principles`, `--storybook`（任意）

## 条件付きコンテキスト

| フラグ         | 読み込み                   | 用途             |
| -------------- | -------------------------- | ---------------- |
| `--frontend`   | applying-frontend-patterns | React/UI         |
| `--principles` | applying-code-principles   | リファクタリング |
| `--storybook`  | integrating-storybook      | Stories          |

## 実行

`ralph-loop`自動イテレーションを伴うRGRCサイクルでTDD実装。

## IDR

実装後、SOWが存在すればIDRを生成（SOWなしならスキップ）。
