---
name: crosscheck
description: Codex + Claude Code のクロスモデルコードレビュー。Codex がレビューし、Claude Code
  がトリアージと修正を行う。クロスチェック, crosscheck, クロスモデルレビュー,
  Codex レビュー に言及した場合に使用。深い品質監査には /audit、PR スクリーニングには
  /preview を使用。
allowed-tools: Bash(codex:*), Bash(git diff:*), Bash(git stash:*), Bash(git status:*),
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

| Step | アクション                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------- |
| 1    | codex インストール確認: `which codex`                                                             |
| 2    | モード検出: `git status --porcelain` で未コミット変更を確認                                       |
| 3    | 変更ファイル取得（下記モード選択参照）                                                            |
| 4    | 変更ファイルなしなら中止                                                                          |
| 5    | テストコマンド検出（CLAUDE.md Commands → package.json scripts.test → Cargo.toml → Makefile test） |

テストコマンド未検出時: 警告して続行（バリデーションはスキップ）。

### モード選択

| 条件                               | モード      | コマンド                     |
| ---------------------------------- | ----------- | ---------------------------- |
| 未コミット変更あり                 | uncommitted | `codex review --uncommitted` |
| 未コミットなし、$BASE との差分あり | base        | `codex review --base $BASE`  |

未コミットとコミット済み変更が両方ある場合: uncommittedモードで実行し、コミット済みのみの変更はカバーされない旨を警告（WIPをコミットしてから再実行を推奨）。

トリアージスコープの変更ファイル:

- uncommittedモード: `git diff --name-only` + `git diff --name-only --cached` + untracked
- baseモード: `git diff --name-only $BASE`

### レビューループ（最大3回）

| Step | アクション                                     |
| ---- | ---------------------------------------------- |
| 6    | 実行: 検出モードで codex review を実行         |
| 7    | Codex 出力をトリアージ（下記ルール参照）       |
| 8    | トリアージ通過 findings なし → ループ終了      |
| 9    | 通過した各 finding を修正                      |
| 10   | バリデーション: テストコマンド実行             |
| 11   | テスト失敗 → 修正を revert、finding をスキップ |
| 12   | 収束確認: fix 前からの `git diff`              |
| 13   | diff 空 → ループ終了（実質変更なし）           |

### ループ後

| Step | アクション   |
| ---- | ------------ |
| 14   | レポート出力 |

## トリアージルール

Codex出力をテキストとして読み取り、`[P1]` `[P2]` のfindingsをfile:line参照付きで抽出する。

| ルール             | アクション                                          |
| ------------------ | --------------------------------------------------- |
| P3 severity        | 除外                                                |
| file:line なし     | スキップ、理由ログ: "location not identified"       |
| ファイルが diff 外 | スキップ、理由ログ: "out of scope (unchanged file)" |

修正優先度のseverityマッピング:

| Codex | 内部   |
| ----- | ------ |
| P1    | high   |
| P2    | medium |

highを先に修正し、次にmedium。

## バリデーション

Step 5で検出したテストコマンドを実行する。

| 結果               | アクション                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| テスト通過         | 次の finding または次の iteration へ                                    |
| テスト失敗         | `git stash` で修正を退避、finding をスキップ（理由: "test regression"） |
| テストコマンドなし | バリデーションスキップ、レポートで警告                                  |

## レポート

全iteration完了後に出力:

```
## Crosscheck レポート

Iterations: N/3
Mode: {base ($BASE) | uncommitted}

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

| エラー                     | アクション                                 |
| -------------------------- | ------------------------------------------ |
| codex 未インストール       | インストール手順を表示して中止             |
| codex review 失敗          | Codex エラー出力を表示して中止             |
| 出力に findings なし       | "Codex found no issues" とレポートして終了 |
| 全 findings スキップ       | スキップ一覧と理由をレポートして終了       |
| fix がビルドエラーを起こす | 修正を revert、finding をスキップ          |

## エスカレーション

| 条件                             | アクション                      |
| -------------------------------- | ------------------------------- |
| Codex がアーキテクチャ問題を指摘 | `/think` での設計レビューを提案 |
| finding が /audit の領域と重複   | `/audit` での深い分析を提案     |
| 修正が diff スコープ外に必要     | スキップしてレポートに記録      |
