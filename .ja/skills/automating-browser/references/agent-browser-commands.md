# agent-browserコマンド

[vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) のCLIリファレンス。

## 目次

- [ナビゲーション](#ナビゲーション)
- [要素操作](#要素操作)
- [データ取得](#データ取得)
- [セマンティック検索](#セマンティック検索)
- [待機](#待機)
- [スナップショット](#スナップショットアクセシビリティツリー)
- [スクリーンショット・エクスポート](#スクリーンショットエクスポート)
- [デバッグ](#デバッグdevtools)
- [ネットワーク](#ネットワーク)
- [ブラウザ設定](#ブラウザ設定)
- [ストレージ・Cookie](#ストレージcookie)
- [セッション管理](#セッション管理)
- [タブ・ウィンドウ](#タブウィンドウ)
- [ダイアログ](#ダイアログ)
- [グローバルオプション](#グローバルオプション)

## ナビゲーション

| コマンド         | 説明                            |
| ---------------- | ------------------------------- |
| `open <url>`     | URLに移動                       |
| `back`           | 履歴を戻る                      |
| `forward`        | 履歴を進む                      |
| `reload`         | ページを更新                    |
| `close`          | ブラウザを終了                  |
| `connect <port>` | CDP経由で接続（DevToolsポート） |

## 要素操作

| コマンド               | 説明                 |
| ---------------------- | -------------------- |
| `click <sel>`          | 要素をクリック       |
| `dblclick <sel>`       | ダブルクリック       |
| `fill <sel> "text"`    | クリアして入力       |
| `type <sel> "text"`    | 要素に入力           |
| `press <key>`          | キー入力             |
| `hover <sel>`          | 要素にカーソルを移動 |
| `select <sel> <value>` | ドロップダウン選択   |
| `check/uncheck <sel>`  | チェックボックス切替 |
| `focus <sel>`          | フォーカスを設定     |

## データ取得

| コマンド                | 戻り値                 |
| ----------------------- | ---------------------- |
| `get text <sel>`        | テキスト内容           |
| `get html <sel>`        | innerHTML              |
| `get value <sel>`       | 入力フィールドの値     |
| `get attr <sel> <attr>` | 属性値                 |
| `get title`             | ページタイトル         |
| `get url`               | 現在のURL              |
| `get count <sel>`       | マッチする要素数       |
| `get box <sel>`         | バウンディングボックス |

## セマンティック検索

| コマンド                             | 説明               |
| ------------------------------------ | ------------------ |
| `find role <role> <action>`          | ARIAロールで検索   |
| `find text <text> <action>`          | 表示テキストで検索 |
| `find label <label> <action>`        | ラベルで検索       |
| `find testid <id> <action>`          | data-testidで検索  |
| `find first/last/nth <sel> <action>` | 特定の要素を取得   |

アクション: `click`, `fill`, `check`, `hover`, `text`

## 待機

| コマンド                  | 説明                       |
| ------------------------- | -------------------------- |
| `wait <sel>`              | 要素が表示されるまで       |
| `wait <ms>`               | 実行を一時停止             |
| `wait --text "text"`      | テキストが表示されるまで   |
| `wait --url "**/path"`    | URLがマッチするまで        |
| `wait --load networkidle` | ネットワークがアイドルまで |
| `wait --fn "expression"`  | JS条件がtrueになるまで     |

## スナップショット（アクセシビリティツリー）

| コマンド            | 説明                         |
| ------------------- | ---------------------------- |
| `snapshot`          | 完全なアクセシビリティツリー |
| `snapshot -i`       | インタラクティブ要素のみ     |
| `snapshot -c`       | コンパクト（空ノードなし）   |
| `snapshot -d <n>`   | 深さを制限                   |
| `snapshot -s <sel>` | CSSセレクタでスコープ        |

## スクリーンショット・エクスポート

| コマンド            | 説明                   |
| ------------------- | ---------------------- |
| `screenshot [path]` | 表示領域をキャプチャ   |
| `screenshot --full` | ページ全体をキャプチャ |
| `pdf <path>`        | PDFとしてエクスポート  |

## デバッグ（DevTools）

| コマンド             | 説明                         |
| -------------------- | ---------------------------- |
| `console`            | コンソール出力を表示         |
| `console --clear`    | コンソールメッセージをクリア |
| `errors`             | ページエラーのスタック表示   |
| `errors --clear`     | エラーログをクリア           |
| `highlight <sel>`    | 要素を視覚的にマーク         |
| `trace start [path]` | トレース記録開始             |
| `trace stop [path]`  | トレースファイル保存         |

## ネットワーク

| コマンド                            | 説明                       |
| ----------------------------------- | -------------------------- |
| `network requests`                  | リクエスト一覧             |
| `network requests --filter <term>`  | キーワードでフィルタ       |
| `network route <url>`               | リクエストをインターセプト |
| `network route <url> --abort`       | リクエストをブロック       |
| `network route <url> --body <json>` | レスポンスをモック         |
| `network unroute [url]`             | ルートハンドラを削除       |

## ブラウザ設定

| コマンド                  | 説明                         |
| ------------------------- | ---------------------------- |
| `set viewport <w> <h>`    | ウィンドウサイズ調整         |
| `set device <name>`       | デバイスをエミュレート       |
| `set geo <lat> <long>`    | 位置情報を設定               |
| `set offline [on\|off]`   | オフラインモード切替         |
| `set media [dark\|light]` | カラースキームをエミュレート |

## ストレージ・Cookie

| コマンド                     | 説明                 |
| ---------------------------- | -------------------- |
| `cookies`                    | 全Cookieを取得       |
| `cookies set <name> <value>` | Cookieを追加         |
| `cookies clear`              | 全Cookieを削除       |
| `storage local`              | 全localStorageを読取 |
| `storage local set <k> <v>`  | localStorage値を設定 |
| `storage local clear`        | localStorageをクリア |

## セッション管理

| コマンド            | 説明                         |
| ------------------- | ---------------------------- |
| `state save <path>` | 認証セッションを保存         |
| `state load <path>` | 認証セッションを復元         |
| `session`           | アクティブセッションIDを表示 |
| `session list`      | 全セッションを表示           |
| `--session <name>`  | 分離されたコンテキストで実行 |

## タブ・ウィンドウ

| コマンド        | 説明                     |
| --------------- | ------------------------ |
| `tab`           | 全タブを表示             |
| `tab new [url]` | 新しいタブを開く         |
| `tab <n>`       | タブを切り替え           |
| `tab close [n]` | タブを閉じる             |
| `window new`    | 新しいウィンドウを開く   |
| `frame <sel>`   | iframeに切り替え         |
| `frame main`    | メインドキュメントに戻る |

## ダイアログ

| コマンド               | 説明                   |
| ---------------------- | ---------------------- |
| `dialog accept [text]` | オプションの入力で確認 |
| `dialog dismiss`       | ダイアログをキャンセル |

## グローバルオプション

| オプション                 | 説明                           |
| -------------------------- | ------------------------------ |
| `--headed`                 | 表示ブラウザ（非ヘッドレス）   |
| `--session <name>`         | 分離されたブラウザコンテキスト |
| `--executable-path <path>` | カスタムブラウザバイナリ       |
