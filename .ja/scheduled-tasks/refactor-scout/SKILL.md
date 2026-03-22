---
name: refactor-scout
description: 週次コード品質巡回: 対象リポジトリをレビューしてリファクタリング候補をGitHub issueで報告
---

リポジトリをレビューし、改善すべき箇所をGitHub issueとして報告する。

## 対象リポジトリ

| リポジトリ | ブランチ |
|-----------|---------|
| thkt/kagami | main |
| thkt/recall | main |

## 手順

各リポジトリについて以下を実行:

### 1. リポジトリ取得

```bash
gh repo clone {repo} /tmp/refactor-scout-{repo_name} -- --depth 1 --branch {branch}
```

clone先の `.claude/` ディレクトリがあれば削除する（挙動への影響を防ぐ）。

### 2. コンテキスト理解

以下を順に読んでプロジェクトの意図を把握:

1. `docs/PURPOSE.md`（必須 — なければこのリポはスキップ）
2. `CLAUDE.md`（あれば）
3. `docs/adr/` または `adr/`（あれば）
4. `README.md`（あれば）

### 3. コード分析

リポ全体を読む必要はない。以下の手順で効率的に探索:

1. ディレクトリ構造を確認
2. PURPOSE.mdのPrioritiesとAccepted Tradeoffsを判断基準にする
3. 重要そうなファイルを選んで読む
4. 気になる箇所があれば `git log --oneline -5 -- {file}` で変更理由を確認
5. 関連するテストの有無を確認

### 4. 意図チェック（issue化の前に必ず実施）

候補が見つかったら、以下を確認:

- PURPOSE.mdのAccepted Tradeoffsに該当しないか
- ADRで意図的な設計判断として記録されていないか
- コミットメッセージに意図的な理由が書かれていないか
- テストで意図的な挙動として保護されていないか

1つでも該当すればissue化しない。

### 5. 既存issueとの重複チェック

```bash
gh issue list --repo {repo} --label "refactor-scout" --state open --json number,title,body
```

同じファイル・同じ観点の指摘は作成しない。

### 6. issue作成（リポあたり最大3件）

```bash
gh issue create --repo {repo} --label "refactor-scout" --title "[refactor-scout] {観点}: {対象}" --body "..."
```

本文形式:

```
## 検出観点

{何を基準に検出したか}

## 現状

{該当コードの引用、メトリクス}

## コンテキスト確認

{git log / ADR / テストから読み取った意図}
{意図的な設計でないと判断した根拠}

## 改善案

{具体的なリファクタリング方針}

## 優先度: {P1/P2/P3}

{根拠: 変更頻度、影響範囲、テスト有無など}
```

優先度の基準:
- P1: 変更頻度が高い + テストなし + 影響範囲が広い
- P2: 上記のうち2つに該当
- P3: 上記のうち1つに該当

### 7. クリーンアップ

```bash
rm -rf /tmp/refactor-scout-*
```

## ルール

- PURPOSE.mdがなければ何もせず次のリポへ
- issueはリポあたり最大3件。それ以上見つかっても優先度の高い3件に絞る
- lint的な指摘（フォーマット、命名規則）は対象外
- 「意図を理解したうえで、それでもおかしい」箇所だけ報告
- 改善すべき箇所が見つからなければissueを作らない。無理に見つけようとしない
