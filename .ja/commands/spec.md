---
description: 実装準備の詳細を含むSpecification（spec.md）を生成
allowed-tools: Read, Write, Glob, Grep, LS
model: opus
argument-hint: "[sowパスまたは機能説明]"
---

# /spec - 仕様書ジェネレーター

実装準備の詳細を含むspec.mdを生成。

## 入力

- SOWパスまたは機能説明: `$1`（任意）
- `$1`が空の場合 → 最新の`$HOME/.claude/workspace/planning/*/sow.md`を自動検出

## 実行

テンプレートでSOWからspecを生成（ID形式: FR-001, T-001, NFR-001）。

テンプレート: [@../../templates/spec/template.md](../../templates/spec/template.md)

トレーサビリティ: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

## Component API（フロントエンド）

UI関連の場合: Propsテーブル、バリアント、状態、使用例を含める。

## 出力

ファイル: `$HOME/.claude/workspace/planning/[same-dir]/spec.md`
