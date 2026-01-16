---
description: SOW受け入れ基準に対して実装を検証
allowed-tools: Read, Glob, Grep
model: opus
argument-hint: "[機能名]"
---

# /validate - SOW基準チェッカー

手動検証のためにSOW受け入れ基準を表示。

## 入力

- 引数なし: 最新SOW
- 引数あり: 特定の機能名

## 実行

1. Globで SOWを検索（`.claude/workspace/planning/*/sow.md`）
2. 受け入れ基準セクションを抽出
3. チェックリストとして表示

## 出力

```markdown
## SOW検証: [機能名]

| AC ID  | 説明   | 確認       | Status |
| ------ | ------ | ---------- | ------ |
| AC-001 | [説明] | [検証内容] | [ ]    |
| AC-002 | [説明] | [検証内容] | [ ]    |
```

## IDR

IDRに`/validate`セクションを追記:

```markdown
## /validate - [YYYY-MM-DD]

| AC ID  | Status | Evidence   |
| ------ | ------ | ---------- |
| AC-001 | PASS   | [検証内容] |
| AC-002 | FAIL   | [検証内容] |
```
