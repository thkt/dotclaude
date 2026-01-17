---
name: automating-browser
description: >
  Browser automation using agent-browser CLI. Best for E2E testing, demos, screenshots.
  Triggers: browser automation, E2E test, ブラウザ操作, スクリーンショット, demo, manual testing.
allowed-tools: [Read, Glob, Bash(agent-browser:*)]
context: fork
user-invocable: false
---

# ブラウザ自動化 (agent-browser)

## 使用タイミング

| ユースケース     | agent-browser | Playwright |
| ---------------- | ------------- | ---------- |
| CLI統合          | 最適          | 複雑       |
| E2Eテスト        | 最適          | 最適       |
| コンテキスト節約 | 最適 (93%↓)   | 重い       |
| GIF録画          | 非対応        | 対応       |

## コアコマンド

| コマンド                            | 目的                       |
| ----------------------------------- | -------------------------- |
| `agent-browser --headed open <url>` | URLを開く（ブラウザ表示）  |
| `agent-browser open <url>`          | URLを開く（ヘッドレス）    |
| `agent-browser snapshot -i`         | インタラクティブ要素を取得 |
| `agent-browser click @ref`          | 要素をクリック             |
| `agent-browser fill @ref "text"`    | クリアして入力             |
| `agent-browser type @ref "text"`    | 要素に入力                 |
| `agent-browser get text @ref`       | 要素のテキストを取得       |
| `agent-browser screenshot [path]`   | スクリーンショットを撮影   |
| `agent-browser close`               | ブラウザセッションを閉じる |

## ワークフロー

| ステップ | アクション                          |
| -------- | ----------------------------------- |
| 1        | `agent-browser --headed open <url>` |
| 2        | `agent-browser snapshot -i`         |
| 3        | `@ref` を使って操作                 |
| 4        | DOM変更後は再度snapshot             |

## 重要ポイント

| ポイント          | 説明                               |
| ----------------- | ---------------------------------- |
| 必ずsnapshot      | refsはsnapshot後のみ有効           |
| DOM変更時は再取得 | click/fill後は新しいrefsを取得     |
| モード切替時      | headed ↔ headless切替時はまずclose |

## パターン

| パターン           | コマンド                                       |
| ------------------ | ---------------------------------------------- |
| フォーム入力       | snapshot -i → fill @ref "value" → click submit |
| ナビゲーション     | click @ref → wait → snapshot                   |
| スクリーンショット | snapshot → screenshot path.png                 |
