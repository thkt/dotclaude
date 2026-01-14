---
name: automating-browser
description: claude-in-chrome MCPツールを使用したインタラクティブブラウザ自動化。デモ、GIF、手動テストに最適。
allowed-tools: [Read, Glob, mcp__claude-in-chrome__*]
context: fork
---

# ブラウザ自動化

claude-in-chrome MCP拡張機能を使用したインタラクティブなブラウザ制御。

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

1. **開始**: `tabs_context_mcp` → タブIDを取得
2. **作成/再利用**: `tabs_create_mcp`または既存を使用
3. **ナビゲート**: `navigate`でURLとtabIdを指定
4. **操作**: `read_page`, `form_input`, `computer`
5. **録画**: `gif_creator`でデモ作成

## 一般的なパターン

### フォーム入力

```text
1. read_page with filter: "interactive"
2. 入力のref_idを特定
3. form_inputでrefと値を指定
```

### GIF録画

```text
1. gif_creator action: "start_recording"
2. スクリーンショット付きでアクション実行
3. gif_creator action: "stop_recording"
4. gif_creator action: "export"
```

## 参照

- [@./references/claude-in-chrome-tools.md] - 完全なツールドキュメント
- [@./references/common-patterns.md] - 再利用可能なパターン
