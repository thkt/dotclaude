# ツール優先ルール

CLI tool > ビルトイン同等品。WebFetch/WebSearch は URL パターンに応じて適切な CLI へフックでルーティングされる。

## コード検索

| タスク                              | 使う                  | 対象                          |
| ----------------------------------- | --------------------- | ----------------------------- |
| 概念 / 識別子 / 関連コード          | `use-cli-yomu` skill      | TS/JSX/CSS/HTML/Rust/Markdown |
| 概念 / 関連コード                   | `Grep` / `Glob`       | Swift / Python / Go / その他  |
| リテラル正規表現 / 既知の正確なパス | `Grep` / `Glob`       | 全言語                        |
| 過去セッション検索                  | `use-cli-recall` skill    | 全言語                        |

## 並列実行

モジュール初接触または BACKLOG タスク着手時、`use-cli-yomu` と `use-cli-recall` を並列実行。詳細は各スキル参照。
