---
name: code
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装。ユーザーが実装して,
  コード書いて, implement,
  coding等に言及した場合に使用。小さなバグ修正やエラー解消には /fix を使用。
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Bash(which:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--no-storybook]"
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
| 「Redテストの検証は不要」        | 未検証のRedは盲目的なコーディング。実行して意図通りの失敗を確認せよ |

## 入力

- `$1` が実装の説明を保持（必須、空なら質問）

### フラグ

| フラグ           | 効果                                              |
| ---------------- | ------------------------------------------------- |
| `--no-storybook` | Storybook自動検出を無効化（デフォルト: 自動検出） |

プロジェクトに Storybook + コンポーネントファイルを検出すると自動発動。詳細は Storybook Phase 参照。

## SOWコンテキスト

[@../../skills/_lib/sow-resolution.md]

## スコープガード

SOW読み込み後、Phaseのファイル数を確認。ファイル数 ≥5のPhaseがあれば、実装前に
`/think` で分割するようユーザーに提案する。SOWがなく `$1` がファイル数 ≥5
を示唆する場合も `/think` の実行を提案する。

## 実行

1. SOWコンテキスト: SOW/specを検出・読み込み → スコープガード
2. `test-generator` をbackground agentとしてspawn（`subagent_type: test-generator`, `run_in_background: true`）
3. `TaskOutput` でテスト結果を受信（実装前に完了を待つ）
4. `ralph-loop --max-iterations 10` 自動イテレーション付きRGRCサイクル
5. レビューゲート: `code-quality-reviewer` をspawn（/fixではスキップ）
6. Storybook Phase（条件付き）
7. E2E Phase（条件付き）
8. Quality Gates

## Spec Evolution

実装中に新しい要件が発見される場合がある（エッジケース、エラーハンドリング、統合上の
懸念）。

1. まずSpecを更新: spec.mdのTest ScenariosテーブルにT-NNNを追加
2. 次にテストを書く: テスト名/コメントで新しいT-NNNを参照
3. Specトレースなしにテストを追加しない: すべてのテストはT-NNNに対応する

`test-quality-evaluator` がT-NNNマッピングを使用してカバレッジスコアを算出する。

## Storybook Phase（条件付き）

### 条件

すべて順にチェックし、1つでも失敗した時点でスキップ。

| #   | チェック                                 | 方法                                                           | 失敗時        |
| --- | ---------------------------------------- | -------------------------------------------------------------- | ------------- |
| 1   | `--no-storybook` フラグ未指定            | `$ARGUMENTS` をパース                                          | スキップ(silent) |
| 2   | プロジェクトにStorybookあり              | `.storybook/` 存在 OR `@storybook/*` が package.json deps にある | スキップ(silent) |
| 3   | 実装にコンポーネントファイルが含まれる   | 変更ファイルに `.tsx`/`.jsx` + PascalCase export                | スキップ(silent) |

### 宣言

条件成立時、生成前に宣言。

```
[auto-detect] Storybook検出 + {File}.tsx がコンポーネントと判定。
{File}.stories.tsx を生成。オプトアウトは --no-storybook。
```

### 実行

検出された各コンポーネントについて `${CLAUDE_SKILL_DIR}/references/csf3-patterns.md` に従い `{Component}.stories.tsx` を生成。Props は Spec の Component API セクションがあれば採用、なければコンポーネントから推論。

### 既存Storiesの扱い

| オプション | アクション                 |
| ---------- | -------------------------- |
| [O]        | 既存ファイルを上書き       |
| [S]        | スキップ（既存を保持）     |
| [M]        | マージ（diff表示、手動）   |
| [D]        | diffのみ追記               |

## E2E Phase（条件付き）

### 条件

すべて順にチェックし、1つでも失敗した時点でスキップ。

| #   | チェック                                    | 方法                                         | 失敗時            |
| --- | ------------------------------------------- | -------------------------------------------- | ----------------- |
| 1   | Specに `Type: e2e` のシナリオあり           | Spec Test Scenarios テーブルを grep          | スキップ (silent) |
| 2   | agent-browser インストール済み              | `which agent-browser`                        | スキップ + advisory |
| 3   | Dev serverが package.json から検出          | `dev`, `start:dev`, `start` スクリプトにマッチ | スキップ + advisory |
| 4   | Dev server起動中（ユーザー確認）            | AskUserQuestion: "Dev server at {url}?"      | スキップ + advisory |

### Dev Server 検出

`package.json` の scripts から検出。

| 優先度 | スクリプト名パターン         | デフォルトURL           |
| ------ | ---------------------------- | ----------------------- |
| 1      | `dev`, `start:dev`           | `http://localhost:5173` |
| 2      | `start`                      | `http://localhost:3000` |
| 3      | `storybook`, `storybook:dev` | `http://localhost:6006` |

スクリプト値内に指定があればポートを抽出（`--port`, `-p`, `PORT=`）。

### 実行

```
Agent(subagent_type: "e2e-test-generator",
      prompt: "spec_path: <path>\ndev_server_url: <url>",
      run_in_background: true)
```

## Quality Gates

| チェック              | 条件                        | 方法                           |
| --------------------- | --------------------------- | ------------------------------ |
| AC達成                | RGRC後                      | 手動（SOWなければスキップ）    |
| Test Quality ≥70      | Spec存在                    | `test-quality-evaluator` agent |
| イテレーション強制    | Write/Edit/MultiEdit毎      | `gates` hook (PostToolUse)     |

詳細は use-workflow-code を参照。

## エラーハンドリング

| エラー                              | アクション                         |
| ----------------------------------- | ---------------------------------- |
| test-generator タイムアウト         | Leader がテストを直接生成          |
| test-generator がテスト0件生成      | specの存在を確認、ユーザーに質問   |
| ralph-loop 停止                     | ループ停止、手動修正               |
| 品質ゲート失敗                      | コミット前に問題を修正             |
| Evaluator スコア <70                | 未カバー/過剰/意図の問題を修正     |
| Evaluator タイムアウト              | ゲートスキップ、警告をログ         |
| Spec 未検出                         | spec.md を作成またはユーザーに確認 |
| agent-browser クラッシュ            | E2Eスキップ、advisory、続行        |
| Dev server 到達不可                 | E2Eスキップ、advisory、続行        |
| E2Eテスト失敗                       | Advisory（ブロックしない）         |
| Storybook Phase エラー              | Phaseスキップ、advisory、続行      |
