---
description: ADRからプロジェクトルールを生成しCLAUDE.mdに統合
allowed-tools: Read, Write, Edit, Bash(ls:*), Grep, Glob
model: opus
argument-hint: "[ADR番号]"
---

# /rulify - ADRからルール生成

ADRをAI実行可能なルール形式に変換。

## 入力

- 引数: ADR番号（必須、例: `1` または `0001`）
- 未指定時: AskUserQuestionで確認

## 実行

ADR解析 → 優先度決定 → ルール生成 → CLAUDE.mdに統合。

### ルール抽出

| ADRセクション | ルール内容     |
| ------------- | -------------- |
| Decision      | 何を強制するか |
| Consequences  | なぜ重要か     |
| Context       | いつ適用するか |

### 優先度マッピング

| 条件                    | 優先度 |
| ----------------------- | ------ |
| セキュリティ/認証関連   | P0     |
| 言語/フレームワーク設定 | P1     |
| 開発プロセス            | P2     |
| 推奨事項                | P3     |

## 出力

| タイプ       | 場所                         |
| ------------ | ---------------------------- |
| ルール       | `rules/[category]/[name].md` |
| リファレンス | CLAUDE.md更新                |

### カテゴリ

| カテゴリ       | 用途               |
| -------------- | ------------------ |
| `core/`        | 基本ルール         |
| `guidelines/`  | ベストプラクティス |
| `development/` | 実装               |

### ルールファイル形式

```markdown
# [RULE_NAME_UPPER_SNAKE_CASE]

Priority: P[0-3]
Source: ADR-[number]

## 適用条件

[いつ適用するか - ADRのDecision Outcomeから]

## 要件

- [すべきこと - ADRの決定/根拠から]

## 禁止事項

- [してはいけないこと - アンチパターン]

## 例

[良い例/悪い例のコード]

## 参照

- ADR: [ADRへのパス]
```

## エラーハンドリング

| エラー            | 解決策       |
| ----------------- | ------------ |
| ADRが見つからない | `adr/`を確認 |
| ルールが存在      | 上書きを確認 |
| CLAUDE.mdがない   | 新規作成     |
