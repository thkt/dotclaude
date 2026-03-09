---
name: polish
description:
  変更コードの再利用性・品質・効率をレビューし修正、さらにAI生成スロップを除去。
  ユーザーが整理して, きれいにして, コード整理, slop除去, ポリッシュ等に言及した
  場合に使用。
allowed-tools:
  Bash(git diff:*), Bash(git log:*), Bash(git status:*), Read, Edit, Grep, Glob,
  Task, Skill
model: opus
argument-hint: "[対象スコープ]"
user-invocable: true
---

# /polish - コードレビュー・クリーンアップ & AIスロップ除去

変更コードをレビュー・修正し、AI生成スロップを除去。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → `git diff HEAD`を分析（staged + unstaged の未コミット変更）

## 実行

| Phase | アクション                                                                              |
| ----- | --------------------------------------------------------------------------------------- |
| 1     | `Skill("simplify", args: "$1")` — 3並列レビュー（再利用、品質、効率）で構造的問題を修正 |
| 2     | `Task` で `subagent_type: code-simplifier` — 更新後のdiffでAIスロップ除去               |
| 3     | 統合結果を報告                                                                          |

### Phase 1: /simplify（バンドル）

`Skill` ツールで呼び出し。カバー範囲:

- 再利用: 既存ユーティリティの重複、インライン共通処理
- 品質: 冗長state、パラメータ増殖、コピペ、leaky abstraction
- 効率: 不要計算、並列化漏れ、ホットパス肥大、メモリリーク

### Phase 2: code-simplifier（カスタムagent）

/simplify 完了後、残りのdiffに対して実行。

除去対象はagent定義を参照: `agents/enhancers/code-simplifier.md`

## 出力

```text
Phase 1 (simplify): 再利用X件、品質Y件、効率Z件を修正
Phase 2 (slop除去): コメントA件削除、ヘルパーB件インライン化
```

## エラーハンドリング

| エラー              | アクション                      |
| ------------------- | ------------------------------- |
| diff変更なし        | "Nothing to polish"報告         |
| /simplify失敗       | 警告ログ、Phase 2に進む         |
| code-simplifier失敗 | 警告ログ、Phase 1の結果のみ報告 |
