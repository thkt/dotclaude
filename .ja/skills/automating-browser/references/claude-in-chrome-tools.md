# claude-in-chrome MCPツール

## ナビゲーション & タブ

| ツール             | パラメータ                 | 説明                         |
| ------------------ | -------------------------- | ---------------------------- |
| `tabs_context_mcp` | `createIfEmpty?`           | **最初に呼ぶ** - タブID取得  |
| `tabs_create_mcp`  | -                          | 新しいタブを作成             |
| `navigate`         | `url`, `tabId`             | URLに移動、"back"、"forward" |
| `resize_window`    | `width`, `height`, `tabId` | ブラウザをリサイズ           |

## コンテンツ読み取り

| ツール          | パラメータ                              | 戻り値                          |
| --------------- | --------------------------------------- | ------------------------------- |
| `read_page`     | `tabId`, `depth?`, `filter?`, `ref_id?` | refを持つアクセシビリティツリー |
| `find`          | `query`, `tabId`                        | 最大20個のマッチング要素        |
| `get_page_text` | `tabId`                                 | プレーンテキストコンテンツ      |

## インタラクション

| ツール            | パラメータ                                   | 説明                       |
| ----------------- | -------------------------------------------- | -------------------------- |
| `form_input`      | `ref`, `value`, `tabId`                      | フォームフィールドに値設定 |
| `javascript_tool` | `action: "javascript_exec"`, `text`, `tabId` | JS実行（`return`なし）     |

## computerアクション

| アクション     | 必須パラメータ                   | 説明                         |
| -------------- | -------------------------------- | ---------------------------- |
| `left_click`   | `coordinate`または`ref`          | シングルクリック             |
| `double_click` | `coordinate`                     | ダブルクリック               |
| `right_click`  | `coordinate`                     | コンテキストメニュー         |
| `type`         | `text`                           | テキスト入力                 |
| `key`          | `text`                           | キー押下: "Enter"、"cmd+a"   |
| `scroll`       | `scroll_direction`, `coordinate` | ページスクロール             |
| `scroll_to`    | `ref`                            | 要素を表示位置までスクロール |
| `hover`        | `coordinate`または`ref`          | カーソル移動                 |
| `screenshot`   | -                                | 表示領域をキャプチャ         |
| `zoom`         | `region: [x0,y0,x1,y1]`          | 領域をキャプチャ             |
| `wait`         | `duration: 0-30`                 | 実行を一時停止               |

## 録画 (gif_creator)

| アクション        | 目的                              |
| ----------------- | --------------------------------- |
| `start_recording` | キャプチャ開始                    |
| `stop_recording`  | キャプチャ終了                    |
| `export`          | GIF生成（`download: true`が必須） |
| `clear`           | フレームを破棄                    |

**ワークフロー**: start → screenshot (初期) → actions + screenshots → screenshot (最終) → stop → export

## デバッグ

| ツール                  | 主要パラメータ                     | 説明             |
| ----------------------- | ---------------------------------- | ---------------- |
| `read_console_messages` | `tabId`, `pattern?`, `onlyErrors?` | コンソールログ   |
| `read_network_requests` | `tabId`, `urlPattern?`             | ネットワーク活動 |

## その他のツール

| ツール                   | 目的                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `update_plan`            | マルチドメイン操作の承認をリクエスト                          |
| `upload_image`           | スクリーンショットをフォーム/ドロップターゲットにアップロード |
| `shortcuts_list/execute` | ブラウザショートカットを実行                                  |
