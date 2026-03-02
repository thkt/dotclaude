---
description:
  TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装。ユーザーが実装して,
  コード書いて, implement, coding等に言及した場合に使用。
allowed-tools:
  Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
---

# /code - TDD実装

TDD/RGRCサイクルによるコード実装。

## 入力

実装の説明: `$1`（必須、空→プロンプト表示）フラグ: `--frontend`, `--principles`,
`--storybook`

| フラグ         | 読み込み                   |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## SOWコンテキスト

[@../../skills/lib/sow-resolution.md]

## Skills & Agents

- Agent: test-generator（TDDテスト生成、standalone background）
- Skill: orchestrating-workflows（RGRCサイクル）
- Plugin: ralph-loop（自動イテレーション、未使用時は手動フォールバック）

## 実行

1. **SOWコンテキスト**: SOW/specを検出・読み込み
2. `test-gen` を standalone background
   agent として spawn（`subagent_type: test-generator`,
   `run_in_background: true`）
3. `TaskOutput` でテスト結果を受信
4. `ralph-loop` 自動イテレーション付き RGRC サイクル
5. Quality Gates

## エラーハンドリング

| エラー                           | アクション                       |
| -------------------------------- | -------------------------------- |
| test-gen background タイムアウト | Leader がテストを直接生成        |
| test-gen がテスト0件生成         | specの存在を確認、ユーザーに質問 |
| Ralph-loop 停止                  | ループ停止、手動修正             |
| 品質ゲート失敗                   | コミット前に問題を修正           |
