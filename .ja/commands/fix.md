---
description: 開発環境で小さなバグや軽微な改善を迅速に修正
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: opus
argument-hint: "[バグまたは問題の説明]"
---

# /fix - クイックバグ修正

根本原因分析とTDD検証による迅速なバグ修正。

## 入力

- 引数: バグまたは問題の説明（必須）
- 未指定時: AskUserQuestionで確認
- スコープ: 小さく理解しやすい問題（1-3ファイル）

## Skills & Agents

| タイプ | 名前                    | 目的                            |
| ------ | ----------------------- | ------------------------------- |
| Skill  | analyzing-root-causes   | 5 Whys手法                      |
| Agent  | test-generator          | リグレッションテスト作成 (fork) |
| Skill  | orchestrating-workflows | 修正ワークフロー定義            |

## 実行

| Step | アクション                                                |
| ---- | --------------------------------------------------------- |
| 1    | 根本原因分析 (5 Whys)                                     |
| 2    | `Task`で`subagent_type: test-generator`によるリグレテスト |
| 3    | 修正実装                                                  |
| 4    | 全テストパス確認                                          |

## エスカレーション

| 信頼度     | アクション                 |
| ---------- | -------------------------- |
| [?] <70%   | エスカレート → `/research` |
| 複雑       | 複数ファイル → `/code`     |
| 新スコープ | 機能 → `/think`            |

## IDR

`/fix`はIDRを生成しない - 決定追跡が必要な機能には`/code`を使用。
