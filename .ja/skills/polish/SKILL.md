---
name: polish
description:
  変更コードの再利用性・品質・効率をレビューし修正、さらにAI生成スロップを除去し
  テストを監査。ユーザーが整理して, きれいにして, コード整理, slop除去,
  ポリッシュ, テスト整理,
  テスト監査等に言及した場合に使用。深いマルチレビュアーの品質監査には /audit
  を使用。
allowed-tools:
  Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob,
  Task, Skill
model: opus
argument-hint: "[対象スコープ]"
user-invocable: true
---

# /polish - コードレビュー・クリーンアップ・AIスロップ除去 & テスト監査

変更コードをレビュー・修正し、AI生成スロップを除去してテストを監査。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → `git diff HEAD`を分析（staged + unstagedの未コミット変更）

## 実行

| Phase | アクション                                                                              |
| ----- | --------------------------------------------------------------------------------------- |
| 1     | `Skill("simplify", args: "$1")` — 3並列レビュー（再利用、品質、効率）で構造的問題を修正 |
| 2     | `Task` で `subagent_type: code-simplifier` — 更新後のdiffでAIスロップ除去 + テスト監査  |
| 3     | 統合結果を報告                                                                          |

### Phase 1: /simplify（バンドル）

`Skill` ツールで呼び出し。カバー範囲:

- 再利用: 既存ユーティリティの重複、インライン共通処理
- 品質: 冗長state、パラメータ増殖、コピペ、leaky abstraction
- 効率: 不要計算、並列化漏れ、ホットパス肥大、メモリリーク

### Phase 2: code-simplifier（カスタムagent）

/simplify完了後、残りのdiffに対して実行。

プロダクションコードのスロップとテスト監査をカバー。agentは構造化テンプレートで両方を報告する — 空セクションも出力に表示される。

agent定義の詳細: `agents/enhancers/code-simplifier.md`

## 出力

```text
Phase 1 (simplify): <再利用/品質/効率のサマリー>
Phase 2 (code):  <file:line付きの変更リスト>
Phase 2 (tests): <file:line付きの変更リスト>
Phase 2 (skipped): <監査されなかったファイルのリスト（理由付き）>
```

## エラーハンドリング

| エラー              | アクション                      |
| ------------------- | ------------------------------- |
| diff変更なし        | "Nothing to polish"報告         |
| /simplify失敗       | 警告ログ、Phase 2に進む         |
| code-simplifier失敗 | 警告ログ、Phase 1の結果のみ報告 |
