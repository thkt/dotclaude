---
name: automating-browser
description: >
  Browser automation using agent-browser CLI. Best for E2E testing, demos, screenshots.
  Use when automating browser interactions, creating E2E tests, or when user mentions
  browser automation, E2E test, ブラウザ操作, スクリーンショット, demo, manual testing.
allowed-tools: [Read, Glob, Bash(agent-browser:*)]
context: fork
user-invocable: false
---

# ブラウザ自動化 (agent-browser)

## コアコマンド

| コマンド                             | 目的                       |
| ------------------------------------ | -------------------------- |
| `agent-browser --headed open <url>`  | URLを開く（ブラウザ表示）  |
| `agent-browser open <url>`           | URLを開く（ヘッドレス）    |
| `agent-browser snapshot -i`          | インタラクティブ要素を取得 |
| `agent-browser click @ref`           | 要素をクリック             |
| `agent-browser fill @ref "text"`     | クリアして入力             |
| `agent-browser type @ref "text"`     | 要素に入力                 |
| `agent-browser press <key>`          | キー押下（Enter, Tab等）   |
| `agent-browser get text @ref`        | 要素のテキストを取得       |
| `agent-browser wait <sel\|ms>`       | 要素または時間を待機       |
| `agent-browser find <loc> <val> <a>` | role/text/labelで検索      |
| `agent-browser screenshot [path]`    | スクリーンショットを撮影   |
| `agent-browser close`                | ブラウザセッションを閉じる |

## デバッグコマンド

| コマンド                                      | 目的                   |
| --------------------------------------------- | ---------------------- |
| `agent-browser console`                       | コンソール出力を表示   |
| `agent-browser errors`                        | JSエラーのスタック表示 |
| `agent-browser network requests`              | リクエスト一覧         |
| `agent-browser network requests --filter api` | キーワードでフィルタ   |
| `agent-browser trace start <path>`            | トレース記録開始       |
| `agent-browser trace stop`                    | トレースファイル保存   |

## ワークフロー

| ステップ | アクション                          |
| -------- | ----------------------------------- |
| 1        | `agent-browser --headed open <url>` |
| 2        | `agent-browser snapshot -i`         |
| 3        | `@ref` を使って操作                 |
| 4        | DOM変更後は再度snapshot             |
| 5        | `console`/`errors`を定期的に確認    |

## 重要ポイント

| ポイント          | 説明                                           |
| ----------------- | ---------------------------------------------- |
| 必ずsnapshot      | refsはsnapshot後のみ有効                       |
| DOM変更時は再取得 | click/fill後は新しいrefsを取得                 |
| DevTools確認      | `console`/`errors`は失敗時ではなく積極的に実行 |
| モード切替時      | headed ↔ headless切替時はまずclose             |

## パターン

| パターン           | コマンド                                       |
| ------------------ | ---------------------------------------------- |
| フォーム入力       | snapshot -i → fill @ref "value" → click submit |
| ナビゲーション     | click @ref → wait → snapshot                   |
| スクリーンショット | snapshot → screenshot path.png                 |
| デバッグ           | action → console → errors → network requests   |
