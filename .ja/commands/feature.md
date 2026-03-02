---
description:
  探索・アーキテクチャ設計・TDD・品質ゲートを含む包括的な機能開発。ユーザーが機能開発,
  新機能, 機能追加, feature development等に言及した場合に使用。
allowed-tools:
  Skill, Bash(npm run), Bash(npm run:*), Bash(npm test:*), Bash(yarn run),
  Bash(yarn run:*), Bash(yarn:*), Bash(pnpm run), Bash(pnpm run:*),
  Bash(pnpm:*), Bash(bun run), Bash(bun run:*), Bash(bun:*), Bash(make:*),
  Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*),
  Bash(git ls-files:*), Bash(git worktree *), Bash(git merge *), Bash(git branch
  *), Bash(date:*), Bash(mkdir:*), Edit, MultiEdit, Write, Read, Glob, Grep, LS,
  Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion
model: opus
argument-hint: "[機能の説明]"
---

# /feature - 機能開発オーケストレーター

/think → /code → /audit →
/validate をチェーンして、エンドツーエンドの機能開発を実行。

## 入力

- 機能の説明: `$1`（任意）
- 空の場合 → AskUserQuestion でプロンプト（コンテキストに応じた選択肢）

### コンテキスト対応オプション

プロジェクト種別を検出 → 関連する選択肢を提示:

| パターン           | 検出方法                                        | 選択肢                                      |
| ------------------ | ----------------------------------------------- | ------------------------------------------- |
| Claude Code config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent |
| React/Next.js      | package.json に `react`, `next`                 | Add component, Add page, Add API route      |
| API server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service   |
| CLI tool           | package.json の bin or `src/cli/`               | Add command, Add option, Add subcommand     |
| Library            | package.json の main/exports                    | Add function, Add class, Add type           |
| Fallback           | 一致なし                                        | New feature, Extension, Refactoring         |

## SOW コンテキスト

[@../../skills/lib/sow-resolution.md]

## 実行

| Phase | 名前           | アクション                            | ユーザーチェックポイント |
| ----- | -------------- | ------------------------------------- | ------------------------ |
| 1     | Discovery      | コンテキストスキャン → PRE_TASK_CHECK | [?] or [→] の解決        |
| 2     | Design         | Skill: /think                         | 設計承認                 |
| 3     | Implementation | Skill: /code                          | —                        |
| 4     | Quality        | /audit → /fix ループ (最大3回)        | 残存課題のみ             |
| 5     | Validation     | Skill: /validate → サマリー           | 完了                     |

### Phase 1: Discovery

1. コンテキストスキャン — CLAUDE.md, package.json, Cargo.toml 等
2. `$1` が空の場合 → コンテキスト対応オプションで AskUserQuestion
3. PRE_TASK_CHECK を実行
4. [→] または [?] を解決
5. 早期終了: 対象ファイル ≤ 2 → `/code` を提案（Phase 2-5 スキップ）
6. TaskCreate でフェーズ追跡（Phase 2-5）

### Phase 2: Design

`Skill("think", $1)` を実行。

出力: `.claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md` + `spec.md`

### Phase 3: Implementation

`Skill("code", $1)` を実行。

/code が Phase 2 の出力から SOW を自動検出。

### Phase 4: Quality Loop

| Step | アクション                               | 終了条件                                       |
| ---- | ---------------------------------------- | ---------------------------------------------- |
| 1    | Skill: /audit（git の変更ファイル対象）  | critical/high が 0 → Step 4                    |
| 2    | Skill: /fix（各 critical/high に対して） | → Step 3                                       |
| 3    | イテレーション加算 (最大3) → Step 1      | 最大到達 → Step 5                              |
| 4    | Skill: /polish → テスト確認              | テスト失敗 → 修正 (最大2回)。失敗継続 → Step 5 |
| 5    | 残存課題を提示（あれば）                 | ユーザーが判断                                 |

変更ファイル: `git diff main...HEAD --name-only`（またはベースブランチ）。

### Phase 5: Validation

`Skill("validate")` を実行。

サマリーを提示:

- 機能スコープ（変更ファイル、追加テスト）
- 品質イテレーション結果と残存課題
- AC カバレッジ

## レジューム

既存のアーティファクトからレジュームポイントを検出:

| アーティファクト                 | レジューム |
| -------------------------------- | ---------- |
| SOW なし                         | Phase 1    |
| SOW `draft`                      | Phase 2    |
| SOW `in-progress` + 実装証跡なし | Phase 3    |
| 実装完了 + 品質未完了            | Phase 4    |
| 品質通過                         | Phase 5    |

実装証跡: `git diff main...HEAD --name-only` が SOW スコープのファイルを含む。

## エラーハンドリング

| エラー                      | アクション                      |
| --------------------------- | ------------------------------- |
| /think キャンセルまたは失敗 | コンテキスト保存、終了          |
| /code 失敗                  | エラーを提示、ユーザーに確認    |
| 品質ループ最大到達（3回）   | 残存課題を提示、ユーザーが判断  |
| /validate で未達 AC         | Phase 3 または 4 への再入を提案 |

## 検証

| チェック                  | 必須 |
| ------------------------- | ---- |
| PRE_TASK_CHECK 通過?      | Yes  |
| SOW + Spec 生成済み?      | Yes  |
| 全テスト通過?             | Yes  |
| /validate で AC 確認済み? | Yes  |
