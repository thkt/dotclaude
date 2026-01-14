---
description: 開発環境で小さなバグや軽微な改善を迅速に修正
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: opus
argument-hint: "[バグまたは問題の説明]"
dependencies: [Explore, generating-tdd-tests, orchestrating-workflows]
---

# /fix - クイックバグ修正

根本原因分析とTDD検証による迅速なバグ修正。

## 入力

- 引数: バグまたは問題の説明（必須）
- 未指定時: AskUserQuestionで確認
- スコープ: 小さく理解しやすい問題（1-3ファイル）

## 実行

根本原因分析 (5 Whys) → リグレッションテスト先行 → 修正 → 検証。

ワークフロー詳細は`orchestrating-workflows`を参照。

## エスカレーション

| 信頼度     | アクション                 |
| ---------- | -------------------------- |
| [?] <70%   | エスカレート → `/research` |
| 複雑       | 複数ファイル → `/code`     |
| 新スコープ | 機能 → `/think`            |

## IDR

`/fix`はIDRを生成しない - 決定追跡が必要な機能には`/code`を使用。
