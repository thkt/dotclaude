---
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, TaskList, TaskUpdate, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
---

# /code - TDD実装

TDD/RGRCサイクルと品質チェックによるコード実装。

## 入力

- 実装の説明: `$1`（必須）
- `$1`が空の場合 → AskUserQuestionで選択
- フラグ: `--frontend`, `--principles`, `--storybook`（任意、`$1`に含める）

### コンテキスト選択

| 質問                 | 選択肢                                   |
| -------------------- | ---------------------------------------- |
| 実装内容             | [Otherで自由入力]                        |
| コンテキスト（任意） | frontend / principles / storybook / none |

## 条件付きコンテキスト

| フラグ         | 読み込み                   | 用途             |
| -------------- | -------------------------- | ---------------- |
| `--frontend`   | applying-frontend-patterns | React/UI         |
| `--principles` | applying-code-principles   | リファクタリング |
| `--storybook`  | integrating-storybook      | Stories          |

## Skills & Agents

| タイプ | 名前                    | 目的                          |
| ------ | ----------------------- | ----------------------------- |
| Agent  | test-generator          | TDDテスト生成 (fork)          |
| Skill  | orchestrating-workflows | RGRCサイクル定義              |
| Plugin | ralph-loop              | 自動イテレーション (external) |

### ralph-loop フォールバック

プラグインなし: 手動イテレーション（各RGRCステップでユーザー確認）

## 実行

| Step | アクション                                              |
| ---- | ------------------------------------------------------- |
| 1    | `Task`で`subagent_type: test-generator`によるテスト生成 |
| 2    | `ralph-loop`自動イテレーションを伴うRGRCサイクル        |
| 3    | テストはforkコンテキストで実行（メインを保持）          |

## SOWステータス更新

SOWが存在する場合、開始時にステータスを`in-progress`に更新。

| 現在のステータス | アクション                       |
| ---------------- | -------------------------------- |
| draft            | 更新 → `in-progress`             |
| in-progress      | スキップ（変更不要）             |
| completed        | 更新 → `in-progress`（作業再開） |
| SOW未検出        | スキップ（アクション不要）       |

## Todo進捗トラッキング

| タイミング   | アクション                              |
| ------------ | --------------------------------------- |
| 開始時       | `TaskList` → フェーズ照合 → in_progress |
| フェーズ完了 | `TaskUpdate` → completed                |
| 次フェーズ   | `TaskUpdate` → next → in_progress       |
| Todo未設定   | スキップ（`/think` 未実行）             |

## 検証

| チェック                                              | 必須 |
| ----------------------------------------------------- | ---- |
| `Task`で`subagent_type: test-generator`を呼び出した？ | Yes  |
