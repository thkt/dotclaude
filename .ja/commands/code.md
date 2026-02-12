---
description: TDD/RGRCサイクルでリアルタイムテストフィードバック付きコード実装。ユーザーが実装して, コード書いて, implement, coding等に言及した場合に使用。
allowed-tools: Bash(npm run), Bash(npm run:*), Bash(yarn run), Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*), Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*), Bash(git status:*), Bash(git log:*), Bash(ls:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, TeamCreate, SendMessage, AskUserQuestion
model: opus
argument-hint: "[実装内容] [--frontend] [--principles] [--storybook]"
---

# /code - TDD実装

TDD/RGRCサイクルと品質チェックによるコード実装。

## 入力

実装の説明: `$1`（必須、空の場合はプロンプト表示）
フラグ: `--frontend`, `--principles`, `--storybook`

| フラグ         | 読み込み                   |
| -------------- | -------------------------- |
| `--frontend`   | applying-frontend-patterns |
| `--principles` | applying-code-principles   |
| `--storybook`  | integrating-storybook      |

## Skills & Agents

- Agent: test-generator（TDDテスト生成、fork）
- Skill: orchestrating-workflows（RGRCサイクル）
- Plugin: ralph-loop（自動イテレーション、未使用時は手動フォールバック）

## チーム構成

```text
/code (LEADER)
└── test-gen (test-generator, TDDテスト生成)
```

## 実行

1. `TeamCreate("code-{timestamp}")`
2. `TaskCreate` でテスト生成 + RGRCフェーズを作成
3. `test-gen` チームメイトを spawn（`subagent_type: test-generator`）
4. test-gen から DM でテスト結果を受信
5. `ralph-loop` 自動イテレーションを伴う RGRC サイクル
6. フェーズ完了ごとに `TaskUpdate`
7. `SendMessage(shutdown_request)` を test-gen に送信

## SOWステータス更新

SOWが存在する場合: `draft` or `completed` → `in-progress` に更新

## Todo進捗トラッキング

`TaskList` + `TaskUpdate` で RGRC フェーズを追跡（`/think` から Todo が存在する場合）
