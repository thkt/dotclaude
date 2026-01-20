# ブラウザ自動化パターン

## コアパターン

| パターン | ステップ                                                       |
| -------- | -------------------------------------------------------------- |
| Setup    | `--headed open <url>` → `snapshot -i` → interact               |
| Form     | `snapshot -i` → `fill @ref "val"` → `click @submit`            |
| Search   | `fill @search "query"` → `press Enter` → `wait` → `snapshot`   |
| Login    | `fill @user` → `fill @pass` → `click @login` → `wait` → verify |

## デバッグワークフロー

| ステップ | アクション                      | 目的            |
| -------- | ------------------------------- | --------------- |
| 1        | 操作を実行                      | アクション実行  |
| 2        | `console` または `errors`       | JSエラー確認    |
| 3        | `network requests --filter api` | API呼び出し確認 |
| 4        | `screenshot` (必要に応じて)     | 視覚的確認      |

## 録画パターン

| ステップ | アクション                    |
| -------- | ----------------------------- |
| 1        | `trace start recording.zip`   |
| 2        | 操作を実行                    |
| 3        | `trace stop`                  |
| 4        | Playwright Trace Viewerで確認 |

## エラーハンドリング

| 問題                 | 診断                           | 解決策                     |
| -------------------- | ------------------------------ | -------------------------- |
| 要素が見つからない   | `snapshot -i`でrefsを確認      | 再snapshot、セレクタ確認   |
| クリック無効         | `console`でJSエラー確認        | JSエラー修正、リトライ     |
| ページがロードしない | `network requests`で失敗確認   | ネットワーク確認、wait延長 |
| 予期しない状態       | `errors`でスタックトレース確認 | エラー元からデバッグ       |
| 不安定な動作         | `trace start`で全て記録        | タイミング問題をtrace確認  |

## レスポンシブテスト

| デバイス     | コマンド                 |
| ------------ | ------------------------ |
| デスクトップ | `set viewport 1920 1080` |
| タブレット   | `set viewport 768 1024`  |
| モバイル     | `set device "iPhone 14"` |

## ベストプラクティス

| Do                               | Don't                     |
| -------------------------------- | ------------------------- |
| DOM変更後は`snapshot -i`         | refsが永続すると仮定      |
| `console`/`errors`を定期的に確認 | エラーが出るまで待つ      |
| アサーション前に`wait`           | 非同期操作と競合          |
| デバッグ時は`--headed`を使用     | ヘッドレスでデバッグ      |
| 複雑なシナリオでは`trace`        | タイミング問題を推測      |
| snapshotからの`@ref`を使用       | CSSセレクタをハードコード |

## セッション永続化

| パターン           | コマンド                                        |
| ------------------ | ----------------------------------------------- |
| ログイン状態保存   | ログイン → `state save auth.json`               |
| ログイン状態再利用 | `state load auth.json` → `open <protected-url>` |
| 分離テスト         | `--session test1`でクロス汚染を防止             |
