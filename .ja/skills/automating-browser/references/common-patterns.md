# ブラウザ自動化パターン

## コアパターン

| パターン | ステップ                                                                      |
| -------- | ----------------------------------------------------------------------------- |
| Setup    | `tabs_context_mcp` → `tabs_create_mcp` → `navigate` → `read_page`             |
| Form     | `read_page filter: "interactive"` → `form_input`各 → `find submit` → `click`  |
| Search   | `find "search"` → `form_input` → `key: "Enter"` → `wait` → `read_page`        |
| Login    | Navigate → ユーザー名入力 → パスワード入力 → ログインクリック → `wait` → 検証 |

## 録画パターン

| Step | アクション                     |
| ---- | ------------------------------ |
| 1    | `gif_creator start_recording`  |
| 2    | screenshot (初期)              |
| 3    | action + screenshot (繰り返し) |
| 4    | screenshot (最終)              |
| 5    | `gif_creator stop_recording`   |
| 6    | `gif_creator export`           |

## エラーハンドリング

| 問題                 | 解決策                                  |
| -------------------- | --------------------------------------- |
| 要素が見つからない   | 代替クエリを試す、スクロール、depth増加 |
| ページがロードしない | `wait`延長、console/networkを確認、報告 |

## レスポンシブテスト

| デバイス     | 解像度    |
| ------------ | --------- |
| デスクトップ | 1920x1080 |
| タブレット   | 768x1024  |
| モバイル     | 375x812   |

## ベストプラクティス

| Do                                 | Don't                          |
| ---------------------------------- | ------------------------------ |
| `tabs_context_mcp`から開始         | タブコンテキスト確認をスキップ |
| ページロードを待つ                 | 機密データを自動送信           |
| `coordinate`より`ref`を使用        | ターゲット確認なしでクリック   |
| アクション前後でスクリーンショット | CAPTCHA/ボット検出を無視       |
