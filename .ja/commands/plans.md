---
description: ワークスペース内の計画ドキュメント（SOW/Spec）を一覧・表示
allowed-tools: Read, Glob
model: opus
argument-hint: "[機能名]"
---

# /plans - 計画ドキュメントビューアー

計画ドキュメント（SOW/Spec）を一覧・表示。

## 入力

- 引数なし: 全SOWドキュメントを一覧
- 引数あり: 特定の機能名を表示

## 実行

検索パス（プロジェクト固有を先に検索）:

```text
.claude/workspace/planning/**/sow.md
~/.claude/workspace/planning/**/sow.md
```

## 出力

```markdown
## 利用可能なSOWドキュメント

| #   | 場所         | 機能          | 日付       |
| --- | ------------ | ------------- | ---------- |
| 1   | プロジェクト | feature-name  | 2025-01-14 |
| 2   | グローバル   | other-feature | 2025-01-13 |
```
