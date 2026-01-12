---
description: ADRからプロジェクトルールを生成しCLAUDE.mdに統合
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: opus
argument-hint: "[ADR番号]"
dependencies: [creating-adrs, managing-documentation]
---

# /rulify - ADRからルール生成

ADRをAI実行可能なルール形式に変換。

## 入力

- 引数: ADR番号（必須、例: `1` または `0001`）
- 未指定時: AskUserQuestionで確認

## 実行

ADR解析 → 優先度決定 → ルール生成 → CLAUDE.mdに統合。

### 優先度マッピング

| 条件                    | 優先度 |
| ----------------------- | ------ |
| セキュリティ/認証関連   | P0     |
| 言語/フレームワーク設定 | P1     |
| 開発プロセス            | P2     |
| 推奨事項                | P3     |

## 出力

```markdown
## ルール生成完了

| 項目   | パス                    |
| ------ | ----------------------- |
| ADR    | adr/0001-title.md       |
| ルール | docs/rules/RULE_NAME.md |
| 統合   | .claude/CLAUDE.md       |
```

## エラーハンドリング

| エラー            | 解決策       |
| ----------------- | ------------ |
| ADRが見つからない | `adr/`を確認 |
| ルールが存在      | 上書きを確認 |
| CLAUDE.mdがない   | 新規作成     |
