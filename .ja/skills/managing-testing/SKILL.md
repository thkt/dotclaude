---
name: managing-testing
description: >
  Testing workflow patterns: E2E test generation, test orchestration.
  Triggers: testing, E2E, end-to-end, playwright, test runner, test orchestration.
allowed-tools: [Read, Write, Glob, Task, Bash]
user-invocable: false
---

# テストワークフロー管理

## ワークフロー

| ワークフロー | リファレンス                    | コマンド |
| ------------ | ------------------------------- | -------- |
| E2Eテスト    | [@./references/e2e-workflow.md] | /e2e     |

## テスト発見優先順位

1. `README.md`を読む → Scriptsセクション
2. `package.json`をチェック → scripts
3. テストファイルを検索（`*.test.*`, `*.spec.*`）
4. 見つからない場合はユーザーに質問

## 一般的なコマンド

| マネージャ | コマンド     |
| ---------- | ------------ |
| npm        | `npm test`   |
| yarn       | `yarn test`  |
| pnpm       | `pnpm test`  |
| vitest     | `npx vitest` |
| jest       | `npx jest`   |
