# CLAUDE.md

## ルール

| ルール | 参照                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| コア   | [@../rules/core/AI_OPERATION_PRINCIPLES.md](../rules/core/AI_OPERATION_PRINCIPLES.md) |
| タスク | [@../rules/core/PRE_TASK_CHECK_SPEC.md](../rules/core/PRE_TASK_CHECK_SPEC.md)         |
| 原則   | [@../rules/PRINCIPLES.md](../rules/PRINCIPLES.md)                                     |
| 削除   | `mv [file] ~/.Trash/ && git add -A`                                                   |

## 開発チェック

| 質問               | 原則           |
| ------------------ | -------------- |
| シンプルな方法は？ | オッカムの剃刀 |
| 1分で理解できる？  | ミラーの法則   |
| 重複していない？   | DRY            |
| 今必要？           | YAGNI          |

スキルは自動起動。詳細: [@../skills/applying-code-principles/SKILL.md](../skills/applying-code-principles/SKILL.md)

## 完了

報告前: tests pass, build pass, lint pass

完了禁止: テスト失敗、ビルドエラー、未解決エラー

コマンド発見: README.md → package.json → ユーザーに確認

コマンド: [@../rules/workflows/WORKFLOW_GUIDE.md](../rules/workflows/WORKFLOW_GUIDE.md)
ドキュメント: [@../rules/conventions/DOCUMENTATION.md](../rules/conventions/DOCUMENTATION.md)
