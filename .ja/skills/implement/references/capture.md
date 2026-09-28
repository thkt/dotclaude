# 撮影の設定と Issue の必要媒体

`.dotagents.json` の `capture` は、implement workflow がいつ撮影し、`destination` の媒体をいつ置き換えるかを決める。Issue の必要媒体と保存先は、この動きに合わせて書く。設定と Issue の要求が食い違うと、独立レビューが `human-decision-required` で止める。規則の正本は Codex の `~/.agents/scripts/README.md` § 対象 repo の設定・§ ホストによるブラウザー検証と撮影にある。

`required: false` は、媒体を更新しないという意味ではない。画面を変える Issue に「媒体を更新しない」と書くと、workflow の撮影と食い違ってレビューが止まる。媒体を残したい変更なら、`capture` の設定を変えるかどうかを人に尋ねる。

| 設定 | workflow の動き | Issue に書くこと |
| --- | --- | --- |
| `capture: null` | 撮影しない | 媒体が要らないという合意 |
| `required: true` | 変更の種類にかかわらず、初回は必ず撮影して `destination` の媒体を置き換える | 撮る画面と操作、`destination` の媒体が置き換わること |
| `required: false` | 変更が通常の Markdown だけなら撮影を省き、既存の媒体を残す。コード・設定・撮影定義・媒体など他の変更を含めば撮影し、`destination` の媒体を置き換える | 画面を変える Issue では、撮る画面と操作、`destination` の媒体が置き換わること |
