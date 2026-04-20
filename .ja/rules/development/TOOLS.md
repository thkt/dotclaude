# ツール優先ルール

CLI tool > ビルトイン同等品。WebFetch/WebSearch は URL パターンに応じて適切な CLI へフックでルーティングされる。

## コード検索

| タスク                              | 使う                  | 対象                          |
| ----------------------------------- | --------------------- | ----------------------------- |
| 概念 / 識別子 / 関連コード          | `yomu-search` skill   | TS/JSX/CSS/HTML/Rust/Markdown |
| 概念 / 関連コード                   | `Grep` / `Glob`       | Swift / Python / Go / その他  |
| リテラル正規表現 / 既知の正確なパス | `Grep` / `Glob`       | 全言語                        |
| 過去セッション検索                  | `recall-search` skill | 全言語                        |

## 並列実行

モジュール初接触または BACKLOG タスク着手時、`yomu-search` と `recall-search` を並列実行。詳細は各スキル参照。
