---
description: SOW受け入れ基準に対して実装を検証
allowed-tools: Read, Glob, Grep
model: inherit
dependencies: [sow-spec-reviewer, managing-planning]
---

# /validate - SOW基準チェッカー

手動検証のためにSOW受け入れ基準を表示。

## ワークフロー参照

**完全ワークフロー**: [@../skills/managing-planning/references/validation-criteria.md](../skills/managing-planning/references/validation-criteria.md)

## 機能

1. Globで最新SOWを検索
2. 受け入れ基準セクションを抽出
3. チェックリストとして表示

## 出力形式

```text
SOW検証チェックリスト

機能: [機能名]

受け入れ基準:

[ ] AC-01: [説明]
    確認: [検証ポイント]

[ ] AC-02: [説明]
    確認: [検証ポイント]
```

## 手動プロセス

```text
1. 基準をレビュー
   └─ 各ACを読む

2. 実装をテスト
   └─ 各機能を実行・確認

3. 結果を比較
   └─ 動作と基準を照合
```

## IDR更新

検証後:

```markdown
## /validate - [YYYY-MM-DD]

| AC ID  | Status | Evidence   |
| ------ | ------ | ---------- |
| AC-001 | PASS   | [検証内容] |
| AC-002 | FAIL   | [検証内容] |
```

## 使用方法

```bash
/validate                 # 最新SOW
/validate "feature-name"  # 特定機能
```

## 関連

- `/think` - SOW作成
- `/sow` - SOW表示
- `/test` - 自動テスト
