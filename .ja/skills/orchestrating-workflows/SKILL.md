---
name: orchestrating-workflows
description: >
  Command workflow orchestration patterns for /code, /fix, /audit, and other implementation commands.
  Triggers: workflow, orchestration, command flow, IDR, test generation, RGRC, quality gates, completion criteria.
allowed-tools: [Read, Write, Grep, Glob, Task, Bash]
user-invocable: false
---

# ワークフローオーケストレーション

## ワークフロー

| コマンド | ワークフロー参照                 |
| -------- | -------------------------------- |
| `/code`  | [@./references/code-workflow.md] |
| `/fix`   | [@./references/fix-workflow.md]  |

## 共有パターン

| パターン    | 参照                                      |
| ----------- | ----------------------------------------- |
| IDR生成     | [@./references/shared/idr-generation.md]  |
| TDDサイクル | [@./references/shared/tdd-cycle.md]       |
| テスト生成  | [@./references/shared/test-generation.md] |

## 品質ゲート

| ゲート     | 目標             | 検証方法                    |
| ---------- | ---------------- | --------------------------- |
| テスト     | 全て通過         | `npm test` 終了コード 0     |
| リント     | エラー 0         | `npm run lint` 終了コード 0 |
| 型         | エラーなし       | `tsc --noEmit` 終了コード 0 |
| カバレッジ | C0 ≥90%, C1 ≥80% | カバレッジレポート          |
