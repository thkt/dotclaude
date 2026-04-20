---
name: code
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装。ユーザーが実装して,
  コード書いて, implement,
  coding等に言及した場合に使用。小さなバグ修正やエラー解消には /fix を使用。
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
user-invocable: true
---

# /code - TDD実装

失敗するテストなしにプロダクションコードを書いてはならない。

違反 → コードを削除し、テストを書き、それから書き直す。

## 開始時の宣言

コードを書く前に必ず宣言:

> TDD RGRCサイクルを開始します。すべてのコード変更は失敗するテストから始めます。

## 合理化への対抗

| 言い訳                           | 対抗                                                                |
| -------------------------------- | ------------------------------------------------------------------- |
| 「これはTDDするほどでもない」    | 単純な変更こそリグレッションを隠す。テスト1行でデバッグ数時間を防ぐ |
| 「テストは後で追加する」         | 「後で」は来ない。テスト負債は複利で増える                          |
| 「これはリファクタリングだけ」   | テストなしのリファクタリングはサイレントリグレッションの第1原因     |
| 「既存のテストがカバーしている」 | カバーしているならRed phaseで確認できる。実行せよ                   |
| 「これをテストすると遅くなる」   | 遅いテストは本番バグより速い                                        |

## 入力

実装の説明: `$1`（必須、空→プロンプト表示）フラグ: `--storybook`

| フラグ        | 読み込み              |
| ------------- | --------------------- |
| `--storybook` | integrating-storybook |

## SOWコンテキスト

[@../../skills/lib/sow-resolution.md]

## Skills & Agents

- Agent: test-generator（TDDテスト生成、standalone background）
- Agent: code-quality-reviewer（レビューゲート、RGRC後）
- Skill: orchestrating-workflows（RGRCサイクル）
- Hook: gates（完了ゲート + レビュー強制、自動イテレーション）

<!-- canonical: rules/core/PREFLIGHT.md (decomposition thresholds) -->

## スコープガード

SOW読み込み後、Phaseのファイル数を確認。ファイル数 ≥5のPhaseがあれば、実装前に
`/think` で分割するようユーザーに提案する。SOWがなく `$1` がファイル数 ≥5
を示唆する場合も `/think` の実行を提案する。

## 実行

1. SOWコンテキスト: SOW/specを検出・読み込み → スコープガード
2. `test-gen` をstandalone background
   agentとしてspawn（`subagent_type: test-generator`,
   `run_in_background: true`）
3. `TaskOutput` でテスト結果を受信
4. `ralph-loop` 自動イテレーション付きRGRCサイクル
5. レビューゲート: `code-quality-reviewer` をspawn（/fixではスキップ）
6. Quality Gates

<!-- canonical: skills/orchestrating-workflows (full gate table) -->

## Spec Evolution

実装中に新しい要件が発見される場合がある（エッジケース、エラーハンドリング、統合上の
懸念）。その場合:

1. まずSpecを更新: spec.mdのTest ScenariosテーブルにT-NNNを追加
2. 次にテストを書く: テスト名/コメントで新しいT-NNNを参照
3. Specトレースなしにテストを追加しない: すべてのテストはT-NNNに対応する

これによりSpecを唯一の信頼源として維持する。`test-quality-evaluator`
agentがT-NNNマッピングを使用してカバレッジスコアを算出する。

## Quality Gates

RGRCサイクル後、各ACの充足（実装済み＋テスト済み）を検証する。SOWがなければスキップ。

Specがある場合、`Agent(subagent_type: "test-quality-evaluator")`をbackgroundで
実行してテスト品質をスコアリング。スコア ≥70が必要。ゲートの詳細は
orchestrating-workflowsを参照。

## エラーハンドリング

| エラー                           | アクション                         |
| -------------------------------- | ---------------------------------- |
| test-gen background タイムアウト | Leader がテストを直接生成          |
| test-gen がテスト0件生成         | specの存在を確認、ユーザーに質問   |
| Ralph-loop 停止                  | ループ停止、手動修正               |
| 品質ゲート失敗                   | コミット前に問題を修正             |
| Evaluator スコア <70             | 未カバー/過剰/意図の問題を修正     |
| Evaluator タイムアウト           | ゲートスキップ、警告をログ         |
| Spec 未検出                      | spec.md を作成またはユーザーに確認 |
