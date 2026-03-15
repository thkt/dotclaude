---
name: fix
description:
  開発環境で小さなバグや軽微な改善を迅速に修正。ユーザーがバグ修正, 直して,
  修正して, fix bug, 不具合等に言及した場合に使用。新機能実装や大規模変更には
  /code を使用。
allowed-tools:
  Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run),
  Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Edit,
  MultiEdit, Read, Grep, Glob, LS, Task, AskUserQuestion
model: opus
argument-hint: "[バグまたは問題の説明]"
user-invocable: true
---

# /fix - クイックバグ修正

根本原因分析とTDD検証による迅速なバグ修正。

## 入力

- バグまたは問題の説明: `$1`
- または: `/audit`出力の提案ID（例: `/fix SUG-001`）
- `$1`が空の場合 → AskUserQuestionで修正種別を選択
- スコープ: 小さく理解しやすい問題（1-3ファイル）

### 修正プロンプト

| 質問     | 選択肢                                 |
| -------- | -------------------------------------- |
| 修正種別 | Bug fix / Error message / Test failure |
| 説明     | [Otherで自由入力]                      |

### 提案IDモード (`/fix SUG-XXX`)

| Step | Action                                                            |
| ---- | ----------------------------------------------------------------- |
| 1    | `$HOME/.claude/workspace/history/` から最新スナップショットを読む |
| 2    | IDで一致する提案を検索                                            |
| 3    | 修正を直接適用（5 Whysスキップ）                                  |
| 4    | テストがパスすることを確認                                        |
| 5    | 対象ファイルのみ再監査を提案: `/audit <変更ファイル>`             |

## Skills & Agents

| タイプ | 名前                  | 目的                            |
| ------ | --------------------- | ------------------------------- |
| Skill  | analyzing-root-causes | 5 Whys手法                      |
| Agent  | test-generator        | リグレッションテスト作成 (fork) |
| Agent  | build-error-resolver  | TypeScript/ビルドエラー修正     |

## 実行

### ビルドチェック

プロジェクトのビルドコマンドを実行（package.jsonまたはプロジェクト設定から検出）。

| 結果             | アクション                                    |
| ---------------- | --------------------------------------------- |
| ビルドエラーあり | `Task`で`subagent_type: build-error-resolver` |
| エラーなし       | Step 1へ続行                                  |

### 標準フロー（ビルドエラーなし）

| Step | アクション                                                                         |
| ---- | ---------------------------------------------------------------------------------- |
| 1    | 根本原因分析 (5 Whys)                                                              |
| 2    | `Task`で`subagent_type: test-generator`によるリグレテスト（症状+再現手順のみ渡す） |
| 3    | 修正実装                                                                           |
| 4    | 全テストパス確認                                                                   |

## エスカレーション

| 信頼度     | アクション                 |
| ---------- | -------------------------- |
| [?] <70%   | エスカレート → `/research` |
| 複雑       | 複数ファイル → `/code`     |
| 新スコープ | 機能 → `/think`            |

## 検証

| チェック項目           | 必須 |
| ---------------------- | ---- |
| 根本原因を特定したか？ | Yes  |
| 全テストがパスするか？ | Yes  |
