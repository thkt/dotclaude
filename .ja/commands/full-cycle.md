---
description: リサーチからバリデーションまでの完全な開発サイクルをオーケストレーション
allowed-tools: SlashCommand, TodoWrite, Read, Write, Edit, MultiEdit
model: opus
argument-hint: "[機能またはタスクの説明]"
dependencies: [orchestrating-workflows]
---

# /full-cycle - 完全開発サイクル

SlashCommand統合を通じて完全な開発サイクルをオーケストレーション。

## 入力

- 引数: 機能またはタスクの説明（必須）
- 未指定時: AskUserQuestionで確認
- フラグ: `--skip=phase,phase`, `--start-from=phase`（任意）

## 実行

| フェーズ | コマンド  | 目的                     | 失敗時             |
| -------- | --------- | ------------------------ | ------------------ |
| 1        | /research | コードベース探索         | ユーザーに確認     |
| 2        | /think    | SOW/Spec作成             | リトライまたは確認 |
| 2.5      | Agent     | sow-spec-reviewer（≥90） | ドキュメント修正   |
| 3        | /code     | TDD実装                  | /fix → リトライ    |
| 4        | /test     | 全テスト実行             | /fix → リトライ    |
| 5        | /audit    | コードレビュー           | 問題を記録         |
| 6        | /validate | 受け入れ基準チェック     | 失敗を報告         |
