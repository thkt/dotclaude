---
name: crosscheck
description:
  Codex + Claude Code のクロスモデルコードレビュー。Codex がレビューし、Claude Code
  がトリアージと修正を行う。クロスチェック, crosscheck, クロスモデルレビュー,
  Codex レビュー に言及した場合に使用。深い品質監査には /audit、PR スクリーニングには
  /preview を使用。
allowed-tools:
  Bash(codex:*), Bash(git diff:*), Bash(git stash:*), Bash(git status:*),
  Bash(cargo test:*), Bash(npm test:*), Bash(npm run test:*), Bash(bun test:*),
  Bash(pnpm test:*), Bash(yarn test:*), Bash(make test:*), Bash(which:*),
  Edit, MultiEdit, Read, Grep, Glob, LS, AskUserQuestion
model: opus
argument-hint: "[ベースブランチ (デフォルト: main)]"
user-invocable: true
---

# /crosscheck - クロスモデルレビュー

Codex (gpt-5.4) がブランチdiffをレビューし、Claude Codeがトリアージと修正を行う。

SOW: ~/.claude/workspace/planning/2026-03-24-crosscheck/sow.md
Spec: ~/.claude/workspace/planning/2026-03-24-crosscheck/spec.md

## 入力

- ベースブランチ: `$1`（デフォルト: `main`）

## 実行

### ループ前

| Step | アクション                                                                   |
| ---- | ---------------------------------------------------------------------------- |
| 1    | codex インストール確認: `which codex`                                        |
| 2    | 変更ファイル取得: `git diff --name-only $BASE`                               |
| 3    | 変更ファイルなしなら中止                                                     |
| 4    | テストコマンド検出（CLAUDE.md Commands → package.json scripts.test → Cargo.toml → Makefile test） |

テストコマンド未検出時: 警告して続行（バリデーションはスキップ）。

### レビューループ（最大3回）

| Step | アクション                                    |
| ---- | --------------------------------------------- |
| 5    | 実行: `codex review --base $BASE`             |
| 6    | Codex 出力をトリアージ（下記ルール参照）       |
| 7    | トリアージ通過 findings なし → ループ終了      |
| 8    | 通過した各 finding を修正                     |
| 9    | バリデーション: テストコマンド実行            |
| 10   | テスト失敗 → 修正を revert、finding をスキップ |
| 11   | 収束確認: fix 前からの `git diff`             |
| 12   | diff 空 → ループ終了（実質変更なし）          |

### ループ後

| Step | アクション     |
| ---- | -------------- |
| 13   | レポート出力   |

## トリアージルール

Codex出力をテキストとして読み取り、`[P1]` `[P2]` のfindingsをfile:line参照付きで抽出する。

| ルール             | アクション                                         |
| ------------------ | -------------------------------------------------- |
| P3 severity        | 除外                                               |
| file:line なし     | スキップ、理由ログ: "location not identified"      |
| ファイルが diff 外 | スキップ、理由ログ: "out of scope (unchanged file)" |

修正優先度のseverityマッピング:

| Codex | 内部     |
| ----- | -------- |
| P1    | high     |
| P2    | medium   |

highを先に修正し、次にmedium。

## 収束条件

| 条件                   | アクション                         |
| ---------------------- | ---------------------------------- |
| findings = 0           | ループ終了、成功レポート           |
| fix 前からの diff = 0  | ループ終了、"実質変更なし" レポート |
| iteration = 3          | ループ終了、残り findings レポート |

## バリデーション

Step 4で検出したテストコマンドを実行する。

| 結果         | アクション                                     |
| ------------ | ---------------------------------------------- |
| テスト通過   | 次の finding または次の iteration へ           |
| テスト失敗   | `git stash` で修正を退避、finding をスキップ（理由: "test regression"） |
| テストコマンドなし | バリデーションスキップ、レポートで警告     |

## レポート

全iteration完了後に出力:

```
## Crosscheck レポート

Iterations: N/3
Base: $BASE

### 修正済み (N)

| # | Severity | File:Line | 説明 |
|---|----------|-----------|------|

### スキップ (N)

| # | Severity | File:Line | 説明 | 理由 |
|---|----------|-----------|------|------|

### サマリー

{検出・修正内容の1-2文まとめ}
```

## エラーハンドリング

| エラー                   | アクション                                |
| ------------------------ | ----------------------------------------- |
| codex 未インストール     | インストール手順を表示して中止            |
| codex review 失敗        | Codex エラー出力を表示して中止            |
| 出力に findings なし     | "Codex found no issues" とレポートして終了 |
| 全 findings スキップ     | スキップ一覧と理由をレポートして終了      |
| fix がビルドエラーを起こす | 修正を revert、finding をスキップ        |

## エスカレーション

| 条件                                  | アクション                            |
| ------------------------------------- | ------------------------------------- |
| Codex がアーキテクチャ問題を指摘      | `/think` での設計レビューを提案       |
| finding が /audit の領域と重複        | `/audit` での深い分析を提案           |
| 修正が diff スコープ外に必要          | スキップしてレポートに記録            |
