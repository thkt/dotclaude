---
description: 探索・アーキテクチャ設計・TDD・品質ゲートを含む包括的な機能開発。ユーザーが機能開発, 新機能, 機能追加, feature development等に言及した場合に使用。
allowed-tools: Skill, Read, Write, Glob, Grep, LS, Task, TaskCreate, TaskList, TaskUpdate, AskUserQuestion, TeamCreate, SendMessage
model: opus
argument-hint: "[機能の説明]"
---

# /feature - 機能開発オーケストレーター

## ローカライゼーション

`~/.claude/settings.json` を読み取り、`language` フィールドを確認。設定されている場合、ユーザー向けテキストをその言語に翻訳。内部処理は英語のまま。

## 入力

- 機能の説明: `$1`（任意）
- 空の場合 → AskUserQuestion でプロンプト（Prompts リファレンス参照）

## 実行フロー

| Phase | 名前           | アクション                                  | ユーザーチェックポイント |
| ----- | -------------- | ------------------------------------------- | ------------------------ |
| 1     | Discovery      | コンテキストスキャン → PRE_TASK_CHECK       | [?] or [→] の解決        |
| 2-4   | Team Explore   | Explorer チーム + Architect → 確認 → /think | 確認事項 + アプローチ    |
| 5     | Implementation | 並列または逐次 TDD/RGRC                     | 承認 + モード選択        |
| 6     | Quality        | /audit → /test → /polish                    | 課題のトリアージ         |
| 7     | Validation     | /validate → サマリー                        | 完了                     |

## Phase 1: Discovery

1. クイックコンテキストスキャン — CLAUDE.md, package.json, Cargo.toml 等で Context Patterns とマッチング
2. `$ARGUMENTS` が空の場合 → コンテキストに応じた選択肢でプロンプト（Prompts リファレンス参照）
3. PRE_TASK_CHECK を実行（ルール: `rules/core/PRE_TASK_CHECK.md`）
4. [→] または [?] がある場合 → AskUserQuestion で解決
5. TaskCreate で todo を作成（Phase 2-4, 5, 6, 7）

### Context Patterns

| パターン           | 検出方法                                        | 選択肢                                           |
| ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| Claude Code config | `~/.claude/` or `.claude/` with commands/hooks/ | Add command, Add skill, Add hook, Add agent      |
| React/Next.js      | package.json に `react`, `next`                 | Add component, Add page, Add API route, Add hook |
| API server         | Express, Fastify, Hono, or `src/routes/`        | Add endpoint, Add middleware, Add service        |
| CLI tool           | package.json の bin or `src/cli/`               | Add command, Add option, Add subcommand          |
| Library            | package.json の main/exports                    | Add function, Add class, Add type                |
| Fallback           | 一致なし                                        | New feature, Feature extension, Refactoring      |

## Phase 2-4: チーム探索 & アーキテクチャ

[@../../skills/orchestrating-feature/references/exploration-team.md]

## Phase 5: 実装

[@../../skills/orchestrating-feature/references/implementation-team.md]

## Phase 6: 品質レビュー

1. /audit → /test → /polish を実行
2. 発見事項を提示、トリアージを質問（Prompts リファレンス参照）
3. 選択された課題に対応

## Phase 7: 検証

1. /validate を実行
2. サマリーを提示

## エラーハンドリング

| 条件                        | アクション                                            |
| --------------------------- | ----------------------------------------------------- |
| チーム/Teammate 生成失敗    | 残りの Teammate で続行、または /code にフォールバック |
| Teammate 無応答/DM 配信失敗 | shutdown_request、Leader が直接データを渡す           |
| Implementer ブロック/失敗   | Leader が引き継ぎ; 両方失敗 → /code                   |
| 統合テスト失敗              | Leader がクロスレイヤーの問題を直接修正               |
| /code 失敗                  | エラーを提示、ガイダンスを求める                      |
| /audit で重大課題           | 解決されるまで Phase 7 をブロック                     |
| ユーザーキャンセル          | 現在の Phase + Step を SOW メタデータに保存           |
| 全フォールバック失敗        | 進捗を SOW に保存、終端状態を報告                     |

## プロンプト

[@../../skills/orchestrating-feature/references/prompts.md]

## レジューム

[@../../skills/orchestrating-feature/references/resume.md]
