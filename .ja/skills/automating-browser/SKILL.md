---
name: automating-browser
description: >
  Interactive browser automation using claude-in-chrome MCP tools. Best for demos, GIFs, manual testing.
  Triggers: browser automation, GIF recording, ブラウザ操作, スクリーンショット, demo, manual testing.
allowed-tools: [Read, Glob, mcp__claude-in-chrome__*]
context: fork
user-invocable: false
---

# ブラウザ自動化

## 使用タイミング

| ユースケース | このスキル | webapp-testing |
| ------------ | ---------- | -------------- |
| GIF録画/デモ | 最適       | 非対応         |
| 手動テスト   | 最適       | OK             |
| CI/CD自動化  | OK         | 最適           |

## コアツール

| ツール             | 目的                        |
| ------------------ | --------------------------- |
| `tabs_context_mcp` | 利用可能なタブを取得        |
| `tabs_create_mcp`  | 新しいタブを作成            |
| `navigate`         | URLに移動                   |
| `read_page`        | ページ構造を取得            |
| `find`             | 要素検索                    |
| `form_input`       | フォームフィールドを入力    |
| `computer`         | マウス/キーボードアクション |
| `gif_creator`      | インタラクションを録画      |

## ワークフロー

| ステップ | アクション                            |
| -------- | ------------------------------------- |
| 1        | `tabs_context_mcp` → タブIDを取得     |
| 2        | `tabs_create_mcp`または既存を使用     |
| 3        | `navigate`でURLとtabIdを指定          |
| 4        | `read_page`, `form_input`, `computer` |
| 5        | `gif_creator`でデモ作成               |

## パターン

| パターン     | ステップ                                                          |
| ------------ | ----------------------------------------------------------------- |
| フォーム入力 | read_page (filter: interactive) → ref_id特定 → form_input         |
| GIF録画      | start_recording → アクション + スクリーンショット → stop → export |

## 参照

| トピック | ファイル                               |
| -------- | -------------------------------------- |
| ツール   | `references/claude-in-chrome-tools.md` |
| パターン | `references/common-patterns.md`        |
