---
name: orchestrating-workflows
description: >
  Workflow orchestration for /code, /fix, /audit, and other commands.
  Triggers: workflow, orchestration, IDR, RGRC, quality gates,
  ワークフロー, 実装フロー, テスト生成, 品質ゲート, 完了基準.
allowed-tools: [Read, Write, Grep, Glob, Task, Bash(npm:*, npx:*, tsc:*, bun:*)]
user-invocable: false
---

# ワークフローオーケストレーション

## ワークフロー

| コマンド | ワークフロー参照                                                |
| -------- | --------------------------------------------------------------- |
| `/code`  | [@./references/code-workflow.md](./references/code-workflow.md) |
| `/fix`   | [@./references/fix-workflow.md](./references/fix-workflow.md)   |

## パターン

| パターン    | 参照                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| IDR生成     | [hooks/lifecycle/idr-pre-commit.sh](../../hooks/lifecycle/idr-pre-commit.sh) |
| TDDサイクル | [@./references/tdd-cycle.md](./references/tdd-cycle.md)                      |
| テスト生成  | [@./references/test-generation.md](./references/test-generation.md)          |

## 品質ゲート

| ゲート     | 目標             | 検証方法                    |
| ---------- | ---------------- | --------------------------- |
| テスト     | 全て通過         | `npm test` 終了コード 0     |
| リント     | エラー 0         | `npm run lint` 終了コード 0 |
| 型         | エラーなし       | `tsc --noEmit` 終了コード 0 |
| カバレッジ | C0 ≥90%, C1 ≥80% | カバレッジレポート          |
