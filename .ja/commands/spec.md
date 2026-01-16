---
description: 実装準備の詳細を含むSpecification（spec.md）を生成
allowed-tools: Read, Write, Glob, Grep, LS
model: opus
argument-hint: "[sowパスまたは機能説明]"
---

# /spec - 仕様書ジェネレーター

実装準備の詳細を含むspec.mdを生成。

## 入力

- 引数: SOWパスまたは機能説明（任意）
- 未指定時: 最新の`.claude/workspace/planning/*/sow.md`を自動検出

## 実行

テンプレートでSOWからspecを生成（ID形式: FR-001, T-001, NFR-001）。

テンプレート: [@../../templates/spec/template.md](../../templates/spec/template.md)

トレーサビリティ: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

## 出力

ファイル: `.claude/workspace/planning/[same-dir]/spec.md`
