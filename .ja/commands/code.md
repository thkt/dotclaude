---
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Bash(cat:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
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

## Skills & Agents

| タイプ | 名前                    | 目的                          |
| ------ | ----------------------- | ----------------------------- |
| Agent  | test-generator          | TDDテスト生成 (fork)          |
| Skill  | orchestrating-workflows | RGRCサイクル定義              |
| Plugin | ralph-loop              | 自動イテレーション (external) |

## 実行

| Step | アクション                                              |
| ---- | ------------------------------------------------------- |
| 1    | `Task`で`subagent_type: test-generator`によるテスト生成 |
| 2    | `ralph-loop`自動イテレーションを伴うRGRCサイクル        |
| 3    | テストはforkコンテキストで実行（メインを保持）          |

## IDR

実装後、SOWが存在すればIDRを生成（SOWなしならスキップ）。
