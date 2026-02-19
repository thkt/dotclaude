---
description: SOWとSpec生成を伴う設計探索。ユーザーが計画して, 設計して, アプローチ検討, 方針決め, planning等に言及した場合に使用。
allowed-tools: Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, AskUserQuestion
model: opus
argument-hint: "[タスク説明]"
---

# /think

深い設計探索。アプローチ比較、前提検証、SOWとSpec生成。

## 入力

`$1`、リサーチコンテキスト、または空の場合は AskUserQuestion でタスク説明を取得。

## 実行

| Step | アクション        | 出力                                   |
| ---- | ----------------- | -------------------------------------- |
| 0    | Q&A明確化         | （不明確な場合）                       |
| 1    | コードベース探索  | 関連コード、パターン、制約             |
| 2    | アプローチ生成    | ≥2つのアプローチとトレードオフ         |
| 3    | セルフチャレンジ  | 弱点の露出、前提の検証                 |
| 4    | 設計構成          | トレーサビリティ付き最適設計           |
| 5    | ユーザーレビュー  | 承認された設計（トレードオフ根拠付き） |
| 5.5  | ADR提案           | （必要な場合）                         |
| 6    | SOW生成           | sow.md                                 |
| 7    | Spec生成          | spec.md                                |
| 8    | sow-spec-reviewer | （オプション、≥90）                    |
| 9    | SOW → Todos       | TaskCreate                             |

## 設計探索（Step 1-4）

### Step 1: コードベース探索

関連コードを読む。`.analysis/architecture.yaml` があれば確認。パターン、制約、アーキテクチャ、先行事例を理解。

### Step 2: アプローチ生成

≥2つの異なるアプローチを異なる視点から生成:

- Pragmatist: 動く最もシンプルな解決策は？
- Architect: 拡張可能で構造的に優れた方法は？
- DX Advocate: 開発者/ユーザー体験にとって最善は？

### Step 3: セルフチャレンジ

各アプローチに対して:

- 隠れた前提は何か？
- 隠れたコストは何か？
- どう失敗するか？
- より簡単な方法は？

### Step 4: 設計構成

生き残ったアプローチから最適設計を構成。

```markdown
## 設計

### 主要な決定

| 決定 | 選択 | 根拠              |
| ---- | ---- | ----------------- |
| ...  | ...  | [視点] にトレース |

### 実装スケッチ

- 変更するファイル: [file:line のリスト]
- 作成するファイル: [目的付きリスト]
- 推定スコープ: [行数, ファイル数]

### トレードオフ

| 採用したこと | 見送ったこと | 理由   |
| ------------ | ------------ | ------ |
| [やること]   | [諦めたこと] | [根拠] |
```

## ドキュメント生成（Steps 6-7）

### Step 6: SOW

テンプレート `templates/sow/template.md` を Read。設計コンテキスト（Steps 1-5）から生成。ID形式: AC-N。
出力: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md`

### Step 7: Spec

テンプレート `templates/spec/template.md` を Read。SOW から生成。ID形式: FR-001, T-001, NFR-001。
トレーサビリティ: `FR-001 Implements: AC-001` → `T-001 Validates: FR-001`
UI関連: Component API（Props、variants、states、usage）を含める。
出力: `.claude/workspace/planning/[same-dir]/spec.md`

## ADR提案（Step 5.5）

ユーザーが設計を承認した後、技術的決定（フレームワーク/ライブラリ選定、アーキテクチャパターン、非推奨化、トレードオフ選択）についてADRが必要か確認。単純な機能追加ならスキップ。

## Todo生成（Step 9）

クロスセッション: `export CLAUDE_CODE_TASK_LIST_ID="[feature]-tasks"` (最大10タスク)

| ソース              | subject           | description                 | activeForm |
| ------------------- | ----------------- | --------------------------- | ---------- |
| Implementation Plan | `Phase N: [説明]` | ステップ + validates AC-XXX | `[説明]中` |
| Test Plan (HIGH)    | `Test: [説明]`    | （複雑な場合）              | `[説明]中` |

## Q&Aカテゴリ

目的、ユーザー、スコープ、優先度（MoSCoW）、成功基準、制約、リスク。

## 出力

このパスを正確に使用すること — Write ツールが親ディレクトリを自動作成する。

`.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` と `spec.md`

## 検証

全ステップ完了必須: コードベース探索、≥2アプローチ比較、セルフチャレンジ適用、設計構成、ユーザーレビュー、sow.md と spec.md 生成、todo作成。
