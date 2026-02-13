---
description: 実装準備の詳細を含むSpecification（spec.md）を生成。ユーザーがスペック作成, 仕様書, 詳細設計, specification等に言及した場合に使用。
allowed-tools: Read, Write, Glob, Grep, LS, AskUserQuestion
model: opus
argument-hint: "[sowパスまたは機能説明]"
---

# /spec - 仕様書ジェネレーター

実装準備の詳細を含むspec.mdを生成。

## 入力

- SOWパスまたは機能説明: `$1`（任意）
- `$1`が空で複数SOWがある場合 → AskUserQuestionで選択
- `$1`が空でSOWが1つの場合 → 最新を自動検出

### SOW選択

SOW一覧 → 機能名+ステータス付きでAskUserQuestionオプションとして提示。

## 実行

テンプレートでSOWからspecを生成（ID形式: FR-001, T-001, NFR-001）。

テンプレート: [@../../templates/spec/template.md](../../templates/spec/template.md)

トレーサビリティ: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`

## Component API（フロントエンド）

UI関連の場合: Propsテーブル、バリアント、状態、使用例を含める。

## 出力

ファイル: `.claude/workspace/planning/[same-dir]/spec.md`
