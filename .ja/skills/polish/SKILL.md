---
name: polish
description: 軽量レビュー + クリーンアップ。構造レビュー、オプションのCodexクロスチェック、
  スロップ除去、テスト監査。整理して, きれいにして, コード整理, slop除去,
  ポリッシュ, テスト整理, テスト監査, クロスチェック, crosscheck,
  Codex レビュー に言及した場合に使用。深いマルチレビュアー監査には /audit を使用。
allowed-tools: Bash(codex:*), Bash(git diff:*), Bash(git log:*), Bash(git stash:*),
  Bash(git status:*), Bash(cargo test:*), Bash(npm test:*), Bash(npm run test:*),
  Bash(bun test:*), Bash(pnpm test:*), Bash(yarn test:*), Bash(make test:*),
  Bash(which:*), Read, Edit, Grep, Glob, LS, Skill, AskUserQuestion
model: opus
argument-hint: "[対象スコープ]"
user-invocable: true
---

# /polish - 軽量レビュー + クリーンアップ

構造レビュー (simplify) + オプションのCodexクロスチェック + コードクリーンアップ +
テスト監査。全修正をフォアグラウンドで直接適用。

## 入力

- 対象スコープ: `$1`（任意）
- `$1`が空の場合 → `git diff HEAD`を分析（staged + unstagedの変更）

## 実行

### Phase 1: 構造レビュー

`Skill("simplify", args: "$1")` — 並列レビュー（再利用、品質、効率）で構造的問題を修正。

### Phase 2: Codexクロスチェック（オプション）

`which codex` 失敗時は全スキップ。

| Step | アクション                                                            |
| ---- | --------------------------------------------------------------------- |
| 1    | モード検出: `git status --porcelain` → uncommitted or base            |
| 2    | `codex review` を検出モードで実行（単一パス）                         |
| 3    | トリアージ: P1/P2をfile:line付きで抽出。P3除外、スコープ外スキップ    |
| 4    | 通過findingsを修正（high → medium順）                                 |
| 5    | テストコマンド検出・バリデーション。テスト失敗時は `git stash` で退避 |

| 条件               | モード      | コマンド                     |
| ------------------ | ----------- | ---------------------------- |
| 未コミット変更あり | uncommitted | `codex review --uncommitted` |
| baseとの差分のみ   | base        | `codex review --base main`   |

未コミット・コミット済み両方ある場合: uncommittedモードを使用。

### Phase 3: コードクリーンアップ

現在のdiffに対してcode-simplifierルールを直接適用（フォアグラウンド）。

ルール: `agents/enhancers/code-simplifier.md`

| 対象       | 範囲                                         |
| ---------- | -------------------------------------------- |
| AIスロップ | 冗長コメント、過剰防御、過剰設計             |
| テスト監査 | 曖昧な名前、コピペ、過剰モック、自明なテスト |

code-simplifierの保持ルール適用 — 迷ったら残す。

## 出力

```text
Phase 1 (simplify): <サマリー>
Phase 2 (codex): <修正N / スキップN（理由付き）/ codex未導入>
Phase 3 (cleanup):
  Code: <file:line付きの変更>
  Tests: <file:line付きの変更>
  Skipped: <未監査ファイル、理由付き>
```

## エラーハンドリング

| エラー              | アクション                          |
| ------------------- | ----------------------------------- |
| diff変更なし        | "Nothing to polish" 報告            |
| /simplify失敗       | 警告ログ、Phase 2に進む             |
| codex未インストール | Phase 2スキップ、Phase 3に進む      |
| codex review失敗    | 警告ログ、Phase 3に進む             |
| 修正がテスト失敗    | `git stash` で退避、findingスキップ |
