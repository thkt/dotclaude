---
description: 実装準備の詳細を含むSpecification（spec.md）を生成
allowed-tools: Read, Write, Glob, Grep, LS
model: opus
argument-hint: "[sowパスまたは機能説明]"
dependencies: [formatting-audits, managing-planning]
---

# /spec - 仕様書ジェネレーター

実装準備の詳細を含むspec.mdを生成。

## 入力

- 引数: SOWパスまたは機能説明（任意）
- 未指定時: 最新の`.claude/workspace/planning/*/sow.md`を自動検出

## 実行

`managing-planning`スキルのテンプレートでSOWからspecを生成。

### 必須セクション

1. 機能要件（FR-001...）
2. データモデル（TypeScriptインターフェース）
3. 実装詳細
4. テストシナリオ（Given-When-Then）
5. 非機能要件（NFR-001...）
6. 依存関係
7. 実装チェックリスト

### トレーサビリティ

- FR-001 `Implements: AC-001` → SOWのACにリンク
- T-001 `Validates: FR-001` → テストが要件を検証

## 出力

```text
.claude/workspace/planning/[same-dir]/spec.md
```
