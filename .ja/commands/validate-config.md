---
description:
  設定の整合性を検証。ユーザーが設定検証, config check, validate
  config等に言及した場合に使用。
allowed-tools: Bash
model: haiku
argument-hint: "[--fix]"
---

# /validate-config

`~/.claude/scripts/validate-config.sh` を実行し、結果を報告。

## チェック項目

| #   | チェック         | 検証内容                                     |
| --- | ---------------- | -------------------------------------------- |
| 1   | スキル参照       | エージェントのスキルディレクトリが存在       |
| 2   | エージェント参照 | コマンドのsubagent_typeファイルが存在        |
| 3   | スキーマ接頭辞   | finding-schema PREFIX → レビューアーファイル |
| 4   | モデル値         | フロントマターのmodelがhaiku/sonnet/opus     |
| 5   | 孤立検出         | エージェントがどこかで参照されている         |

`--fix` が渡された場合、各エラーの修正案を提示。
