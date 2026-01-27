# CLAUDE.md

## ルール

| ルール | 参照                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------- |
| コア   | [@./rules/core/AI_OPERATION_PRINCIPLES.md](./rules/core/AI_OPERATION_PRINCIPLES.md)             |
| タスク | [@./rules/core/PRE_TASK_CHECK_SPEC.md](./rules/core/PRE_TASK_CHECK_SPEC.md)                     |
| 削除   | `mv [file] ~/.Trash/ && git add -A` (sandboxエラー → `dangerouslyDisableSandbox: true`で再試行) |

## 開発チェック

| 質問               | 原則           |
| ------------------ | -------------- |
| シンプルな方法は？ | オッカムの剃刀 |
| 1分で理解できる？  | ミラーの法則   |
| 重複していない？   | DRY            |
| 今必要？           | YAGNI          |

## 完了

| 条件     | 要件                                   |
| -------- | -------------------------------------- |
| 報告前   | tests pass, build pass, lint pass      |
| 報告禁止 | テスト失敗、ビルドエラー、未解決エラー |

| 発見     | 順序                                      |
| -------- | ----------------------------------------- |
| コマンド | README.md → package.json → ユーザーに確認 |

参照: [@./rules/workflows/WORKFLOW_GUIDE.md](./rules/workflows/WORKFLOW_GUIDE.md), [@./rules/conventions/DOCUMENTATION.md](./rules/conventions/DOCUMENTATION.md)
