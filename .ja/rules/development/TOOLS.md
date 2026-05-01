# Tool Preferences

CLI ツール > 組み込み相当。WebFetch/WebSearch は URL パターンに基づいてフックで適切な CLI にルーティングされる。

## コード検索

| タスク                              | 使う                   | 適用条件                      |
| ----------------------------------- | ---------------------- | ----------------------------- |
| 概念 / 識別子 / 関連コード          | `use-cli-yomu` skill   | TS/JSX/CSS/HTML/Rust/Markdown |
| 概念 / 関連コード                   | `Grep` / `Glob`        | Swift / Python / Go / その他  |
| リテラル正規表現 / 既知の正確なパス | `Grep` / `Glob`        | 任意の言語                    |
| 過去セッション検索                  | `use-cli-recall` skill | 任意の言語                    |

## 並列実行

モジュール初接触または BACKLOG タスク開始時、`use-cli-yomu` と `use-cli-recall` を並列実行する。詳細は各 skill にある。
