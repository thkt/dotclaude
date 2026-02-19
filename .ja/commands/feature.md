---
description: 探索・アーキテクチャ設計・TDD・品質ゲートを含む包括的な機能開発。ユーザーが機能開発, 新機能, 機能追加, feature development等に言及した場合に使用。
allowed-tools: Skill, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[機能の説明]"
---

# /feature - 機能開発オーケストレーター

## ローカライゼーション

`~/.claude/settings.json` の `language` フィールドを確認。設定時はユーザー向けテキストを翻訳。内部処理は英語のまま。

## 入力

- 機能の説明: `$1`（任意）
- 空の場合 → AskUserQuestion でプロンプト（Prompts リファレンス参照）

## 実行フロー

| Phase | 名前           | アクション                                  | ユーザーチェックポイント |
| ----- | -------------- | ------------------------------------------- | ------------------------ |
| 1     | Discovery      | コンテキストスキャン → PRE_TASK_CHECK       | [?] or [→] の解決        |
| 2-4   | Team Explore   | Explorer チーム + Architect → 確認 → /think | 確認事項 + アプローチ    |
| 5     | Implementation | 並列または逐次 TDD/RGRC                     | 承認 + モード選択        |
| 6     | Quality Loop   | audit→fix→re-audit (最大3回) → /polish      | 残存課題のみ             |
| 7     | Validation     | /validate → サマリー                        | 完了                     |

## フェーズハンドオフ

[@../../skills/orchestrating-feature/references/phase-handoff.md]

## Phase 1: Discovery

1. コンテキストスキャン — CLAUDE.md, package.json, Cargo.toml 等で Context Patterns マッチ
2. `$ARGUMENTS` が空の場合 → コンテキストに応じた選択肢でプロンプト（Prompts リファレンス参照）
3. PRE_TASK_CHECK を実行（`rules/core/PRE_TASK_CHECK.md`）
4. [→] または [?] がある場合 → AskUserQuestion で解決
5. 早期終了: 対象ファイル ≤ 2 かつ同一サブツリー → `/code` を提案（Phase 2-7 スキップ）
6. TaskCreate で todo を作成（Phase 2-4, 5, 6, 7）
7. handoff.yaml に `discovery` セクションを書き込み

### Context Patterns

| パターン           | 値                 | 検出方法                                        | 選択肢                                           |
| ------------------ | ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Claude Code config | claude-code-config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent      |
| React/Next.js      | react-nextjs       | package.json に `react`, `next`                 | Add component, Add page, Add API route, Add hook |
| API server         | api-server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service        |
| CLI tool           | cli-tool           | package.json の bin or `src/cli/`               | Add command, Add option, Add subcommand          |
| Library            | library            | package.json の main/exports                    | Add function, Add class, Add type                |
| Fallback           | fallback           | 一致なし                                        | New feature, Feature extension, Refactoring      |

## Phase 2-4: チーム探索 & アーキテクチャ

[@../../skills/orchestrating-feature/references/exploration-team.md]

## Phase 5: 実装

[@../../skills/orchestrating-feature/references/implementation-team.md]

handoff.yaml に `implementation` セクションを書き込み（files_changed, tests_added, mode）。

## Phase 6: 品質ループ

[@../../skills/orchestrating-feature/references/quality-loop.md]

handoff.yaml に `quality` セクションを書き込み（iterations, auto_fixed, remaining, tests_passing）。

## Phase 7: 検証

1. handoff.yaml から機能全体のコンテキストを読み込み
2. /validate を実行
3. サマリーを提示

## エラーハンドリング

| 条件                        | アクション                              |
| --------------------------- | --------------------------------------- |
| チーム/Teammate 生成失敗    | 残りの Teammate で続行、または /code    |
| Teammate 無応答/DM 配信失敗 | shutdown_request、Leader がデータ直渡し |
| Implementer ブロック/失敗   | Leader が引き継ぎ; 両方失敗 → /code     |
| 統合テスト失敗              | Leader がクロスレイヤー問題を修正       |
| /code 失敗                  | エラーを提示、ガイダンスを求める        |
| 品質ループ最大到達          | Phase 7 前に残存課題を提示              |
| ユーザーキャンセル          | Phase + Step を SOW メタデータに保存    |
| 全フォールバック失敗        | 進捗を SOW に保存、終端状態を報告       |

## プロンプト

[@../../skills/orchestrating-feature/references/prompts.md]

## レジューム

[@../../skills/orchestrating-feature/references/resume.md]
