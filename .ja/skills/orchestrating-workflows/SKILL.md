---
name: orchestrating-workflows
description: >
  /code, /fix, /audit 等のワークフローオーケストレーション。Triggers: /code
  ワークフロー, /fix ワークフロー, quality gates, 品質ゲート, RGRC サイクル,
  completion criteria.
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

全4ゲート必須。省略不可。

| ゲート     | 目標             | 検証方法                    |
| ---------- | ---------------- | --------------------------- |
| テスト     | 全て通過         | `npm test` 終了コード 0     |
| リント     | エラー 0         | `npm run lint` 終了コード 0 |
| 型         | エラーなし       | `tsc --noEmit` 終了コード 0 |
| カバレッジ | C0 ≥90%, C1 ≥80% | カバレッジレポート          |

## 合理化カウンター

| 言い訳                                   | 反論                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| "テスト通ったからリントは後で"           | リントエラーは技術的負債。コミット前にゼロエラー              |
| "型エラーは警告みたいなもの"             | `tsc --noEmit` 終了コード 0 でなければ出荷しない。警告=エラー |
| "カバレッジはほぼ足りてる"               | "ほぼ" は遠回りの失敗。閾値を満たすこと                       |
| "このゲートはこの変更には当てはまらない" | 全4ゲートは全変更に適用。例外なし                             |
