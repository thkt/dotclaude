---
name: code
description:
  TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装。ユーザーが実装して,
  コード書いて, implement,
  coding等に言及した場合に使用。小さなバグ修正やエラー解消には /fix を使用。
allowed-tools:
  Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*),
  Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run),
  Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git
  log:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
user-invocable: true
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
5. Quality Gates

## Quality Gates

RGRCサイクル後、各ACの充足（実装済み＋テスト済み）を検証する。SOWがなければスキップ。

## エラーハンドリング

| エラー                           | アクション                       |
| -------------------------------- | -------------------------------- |
| test-gen background タイムアウト | Leader がテストを直接生成        |
| test-gen がテスト0件生成         | specの存在を確認、ユーザーに質問 |
| Ralph-loop 停止                  | ループ停止、手動修正             |
| 品質ゲート失敗                   | コミット前に問題を修正           |
