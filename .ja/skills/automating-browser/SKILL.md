---
name: automating-browser
description: >
  claude-in-chrome MCPツールを使用したインタラクティブブラウザ自動化。
  最適な用途: デモ、ドキュメントGIF、手動テスト、ライブブラウザ制御。
  CI/CDでの自動E2Eテストには、代わりにwebapp-testingスキルを使用。
  トリガー: browser automation, ブラウザ自動化, screenshot, スクリーンショット,
  form fill, フォーム入力, click, navigate, GIF recording, GIF録画,
  ブラウザ操作, Chrome, demo, デモ, live browser.
allowed-tools: Read, Glob, mcp__claude-in-chrome__*
---

# ブラウザ自動化ガイド

claude-in-chrome MCP拡張機能を使用したインタラクティブなブラウザ制御。

## 目的

以下のための**インタラクティブ**ブラウザ自動化を有効化:

- デモ録画とGIFドキュメント
- ライブブラウザフィードバック付き手動テスト
- フォーム入力とリアルタイムインタラクション
- 視覚的検証のためのスクリーンショットキャプチャ
- 現在のブラウザからのWebデータ抽出

## このスキルの使用タイミング

| ユースケース                     | このスキル | webapp-testing（公式） |
| -------------------------------- | ---------- | ---------------------- |
| GIF録画/デモ                     | [最適]     | [非対応]               |
| 手動テスト/検証                  | [最適]     | [OK]                   |
| CI/CD自動テスト                  | [OK]       | [最適]                 |
| サーバーライフサイクル付きテスト | [非対応]   | [最適] with_server.py  |
| 既存Chromeセッションの使用       | [対応]     | [非対応]               |

**クイック判断**: 「見せて検証」→このスキル、「自動化して実行」→webapp-testing

## はじめに

### 1. タブコンテキスト必須

**常にここから開始**:

```text
mcp__claude-in-chrome__tabs_context_mcp
```

これにより、後続の操作に使用可能なタブIDが提供される。

### 2. タブの作成または再利用

```markdown
# 新しいタブを作成

mcp**claude-in-chrome**tabs_create_mcp

# またはコンテキストから既存のタブを使用
```

### 3. ナビゲーション

```text
mcp__claude-in-chrome__navigate
  url: "https://example.com"
  tabId: {tabs_context_mcpから取得}
```

## コアツール

| ツール             | 目的                        |
| ------------------ | --------------------------- |
| `tabs_context_mcp` | 利用可能なタブを取得        |
| `tabs_create_mcp`  | 新しいタブを作成            |
| `navigate`         | URLに移動                   |
| `read_page`        | ページ構造を取得            |
| `find`             | 自然言語での要素検索        |
| `form_input`       | フォームフィールドを入力    |
| `computer`         | マウス/キーボードアクション |
| `get_page_text`    | テキストコンテンツを抽出    |
| `gif_creator`      | インタラクションを録画      |

## ページコンテンツの読み取り

| ツール                                   | ユースケース                            |
| ---------------------------------------- | --------------------------------------- |
| `read_page`                              | アクセシビリティツリー（DOM構造）を取得 |
| `read_page` with `filter: "interactive"` | ボタン、リンク、入力のみ                |
| `find`                                   | 自然言語での要素検索                    |
| `get_page_text`                          | 記事/メインテキストを抽出               |

### 例: インタラクティブ要素の読み取り

```text
mcp__claude-in-chrome__read_page
  tabId: 123
  filter: "interactive"
```

## 一般的なパターン

### フォーム入力

1. `read_page` with `filter: "interactive"` で入力を検索
2. 入力の `ref_id` を特定（例: `ref_1`, `ref_2`）
3. `form_input` で ref と値を指定

```text
mcp__claude-in-chrome__form_input
  tabId: 123
  ref: "ref_5"
  value: "user@example.com"
```

### クリックアクション

```text
mcp__claude-in-chrome__computer
  tabId: 123
  action: "left_click"
  ref: "ref_10"  # または座標: [100, 200]
```

### スクリーンショットキャプチャ

```text
mcp__claude-in-chrome__computer
  tabId: 123
  action: "screenshot"
```

### GIF録画

1. 録画開始
2. スクリーンショット撮影（初期フレーム）
3. アクション実行
4. スクリーンショット撮影（最終フレーム）
5. 録画停止
6. エクスポート

```markdown
# 開始

mcp**claude-in-chrome**gif_creator
tabId: 123
action: "start_recording"

# ... スクリーンショット付きでアクション実行 ...

# 停止

mcp**claude-in-chrome**gif_creator
tabId: 123
action: "stop_recording"

# エクスポート

mcp**claude-in-chrome**gif_creator
tabId: 123
action: "export"
download: true
filename: "workflow-demo.gif"
```

## 詳細参照

| 参照                                                                              | 目的                             |
| --------------------------------------------------------------------------------- | -------------------------------- |
| [@./references/claude-in-chrome-tools.md](./references/claude-in-chrome-tools.md) | 完全なツールドキュメント         |
| [@./references/common-patterns.md](./references/common-patterns.md)               | 再利用可能なワークフローパターン |
| [@./references/e2e-testing.md](./references/e2e-testing.md)                       | E2Eテスト方法論                  |

## セキュリティ注意事項

- 複数ドメイン操作には常に `update_plan` を使用
- 機密データ処理にはユーザー確認が必要
- 金融情報を含むフォームを自動送信しない
- ボット検出システム（CAPTCHA）に注意

## 参照

### 関連スキル

- `webapp-testing`（公式） - Playwright E2E自動テスト（CI/CD最適化）
- `utilizing-cli-tools` - CLIツールガイド
- `generating-tdd-tests` - テスト設計

### 使用コマンド

- `/e2e` - E2Eテスト + ドキュメント生成
- `/test` - E2Eテスト実行（ブラウザテスト含む）

### 参照

- `/example-skills:webapp-testing` - 公式スキル（Playwright + with_server.py）
