# claude-in-chrome MCPツールリファレンス

claude-in-chrome MCPツールの完全なリファレンス。

## ナビゲーション & タブ

| ツール | パラメータ | 戻り値 |
| --- | --- | --- |
| `tabs_context_mcp` | `createIfEmpty?` | グループ内のタブID |
| `tabs_create_mcp` | - | 新しいタブID |
| `navigate` | `url`, `tabId` | - |
| `resize_window` | `width`, `height`, `tabId` | - |

### tabs_context_mcp

**最初に必ず呼び出す** - 利用可能なタブを取得。

```text
パラメータ:
  createIfEmpty: boolean (オプション) - タブがない場合に作成
戻り値:
  MCPグループ内のタブIDリスト
```

### navigate

```text
パラメータ:
  url: string - ナビゲート先URL（https://がない場合は追加）
  tabId: number - tabs_context_mcpからのタブID
特別な値:
  url: "back" - 履歴を戻る
  url: "forward" - 履歴を進む
```

## コンテンツ読み取り

| ツール | パラメータ | 戻り値 |
| --- | --- | --- |
| `read_page` | `tabId`, `depth?`, `filter?`, `ref_id?` | アクセシビリティツリー |
| `find` | `query`, `tabId` | refを持つマッチング要素 |
| `get_page_text` | `tabId` | プレーンテキストコンテンツ |

### read_page

ページ構造をアクセシビリティツリーとして取得。

```text
パラメータ:
  tabId: number (必須)
  depth: number (オプション, デフォルト: 15) - ツリーの深さ
  filter: "interactive" | "all" (オプション) - 要素フィルター
  ref_id: string (オプション) - 特定の要素にフォーカス
戻り値:
  要素参照を持つアクセシビリティツリー (ref_1, ref_2 等)
```

### find

自然言語による要素検索。

```text
パラメータ:
  query: string - 要素の説明 (例: "検索バー", "ログインボタン")
  tabId: number
戻り値:
  参照を持つ最大20個のマッチング要素
```

### get_page_text

記事/メインテキストコンテンツを抽出。

```text
パラメータ:
  tabId: number
戻り値:
  HTMLなしのプレーンテキスト
```

## インタラクション

| ツール | パラメータ | 戻り値 |
| --- | --- | --- |
| `computer` | `action`, `tabId`, アクション固有パラメータ | スクリーンショット/結果 |
| `form_input` | `ref`, `value`, `tabId` | - |
| `javascript_tool` | `action`, `text`, `tabId` | JS結果 |

### form_input

フォームフィールドの値を設定。

```text
パラメータ:
  tabId: number
  ref: string - 要素参照 (例: "ref_5")
  value: string | boolean | number - 設定する値
```

### javascript_tool

ページコンテキストでJavaScriptを実行。

```text
パラメータ:
  tabId: number
  action: "javascript_exec" (必須)
  text: string - 実行するJSコード
注意:
  'return'を使わない - 式を直接書く
  例: "window.scrollY" であって "return window.scrollY" ではない
```

## computerアクション

`computer`ツールは複数のアクションをサポート:

### クリックアクション

| アクション | 必須 | 説明 |
| --- | --- | --- |
| `left_click` | `coordinate` または `ref` | シングルクリック |
| `double_click` | `coordinate` | ダブルクリック |
| `triple_click` | `coordinate` | トリプルクリック（行選択） |
| `right_click` | `coordinate` | コンテキストメニュー |

```text
例:
  action: "left_click"
  ref: "ref_10"
  # または
  coordinate: [100, 200]
  modifiers: "ctrl+shift" (オプション)
```

### 入力アクション

| アクション | 必須 | 説明 |
| --- | --- | --- |
| `type` | `text` | テキスト入力 |
| `key` | `text` | キー押下 |

```text
キー例:
  text: "Enter"
  text: "Tab"
  text: "cmd+a" (Mac) / "ctrl+a" (Windows)
  text: "Backspace Backspace Delete" (複数キー)
  repeat: 5 (オプション - キー押下を繰り返す)
```

### ナビゲーションアクション

| アクション | 必須 | 説明 |
| --- | --- | --- |
| `scroll` | `scroll_direction`, `coordinate` | ページスクロール |
| `scroll_to` | `ref` | 要素を表示位置までスクロール |
| `hover` | `coordinate` または `ref` | カーソル移動 |

```text
scroll_direction: "up" | "down" | "left" | "right"
scroll_amount: 1-10 (オプション, デフォルト: 3)
```

### キャプチャアクション

| アクション | 必須 | 説明 |
| --- | --- | --- |
| `screenshot` | - | 表示領域をキャプチャ |
| `zoom` | `region` | 特定領域をキャプチャ |
| `wait` | `duration` | 実行を一時停止 |

```text
zoom region: [x0, y0, x1, y1] - 矩形座標
wait duration: 0-30秒
```

## 録画

### gif_creator

インタラクションをGIFとして録画。

```text
パラメータ:
  tabId: number
  action: "start_recording" | "stop_recording" | "export" | "clear"

エクスポートオプション:
  download: true (エクスポートに必須)
  filename: string (オプション)
  options:
    showClickIndicators: boolean (デフォルト: true)
    showActionLabels: boolean (デフォルト: true)
    showProgressBar: boolean (デフォルト: true)
    showDragPaths: boolean (デフォルト: true)
    showWatermark: boolean (デフォルト: true)
    quality: 1-30 (デフォルト: 10, 低い = 高品質)
```

### 録画ワークフロー

```markdown
1. gif_creator action: "start_recording"
2. computer action: "screenshot"  # 初期フレーム
3. ... アクションを実行 ...
4. computer action: "screenshot"  # 最終フレーム
5. gif_creator action: "stop_recording"
6. gif_creator action: "export", download: true
```

## デバッグ

| ツール | パラメータ | 説明 |
| --- | --- | --- |
| `read_console_messages` | `tabId`, `pattern?`, `limit?`, `clear?`, `onlyErrors?` | コンソールログ |
| `read_network_requests` | `tabId`, `urlPattern?`, `limit?`, `clear?` | ネットワーク活動 |

### read_console_messages

```text
パラメータ:
  tabId: number
  pattern: string (オプション) - 正規表現フィルター
  limit: number (オプション, デフォルト: 100)
  onlyErrors: boolean (オプション) - エラーのみ
  clear: boolean (オプション) - 読み取り後にクリア
```

### read_network_requests

```text
パラメータ:
  tabId: number
  urlPattern: string (オプション) - URL含有フィルター
  limit: number (オプション, デフォルト: 100)
  clear: boolean (オプション) - 読み取り後にクリア
```

## その他のツール

### update_plan

マルチドメイン操作のユーザー承認をリクエスト。

```text
パラメータ:
  domains: string[] - 訪問するドメイン
  approach: string[] - 実行する内容
```

### upload_image

スクリーンショットをフォームまたはドロップターゲットにアップロード。

```text
パラメータ:
  tabId: number
  imageId: string - スクリーンショットから
  ref: string | coordinate: [x, y] - ターゲット
```

### shortcuts_list / shortcuts_execute

ブラウザショートカットの一覧表示と実行。

```text
shortcuts_list:
  tabId: number

shortcuts_execute:
  tabId: number
  command: string - ショートカット名
```
