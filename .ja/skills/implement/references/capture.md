# 撮影の設定と Issue の必要媒体

`.dotagents.json` の `capture` は、`launch.ts` がいつ撮影し、`destination` の媒体をいつ置き換えるかを決める。Issue の必要媒体と保存先は、この動きに合わせて書く。設定と Issue の要求が食い違うと、レビューが必須の指摘を返し、修理とレビューが進まずに止まる。capture コマンドの `{harness}` が指す Playwright アダプターは、この repo が同梱している。撮影は、`launch.ts` が、sandbox の外で走らせる。macOS では、Claude Code の sandbox の中で Chromium を起動できない (Mach service の登録が拒否され、許可する設定も無い)。`launch.ts` を sandbox の中で呼ぶと、撮影は `capture-unavailable` で止まる。対象の `capture.command` は `bun {harness}/scripts/capture/capture.ts SPEC CONFIG` を呼ぶ。

`required: false` は、媒体を更新しないという意味ではない。画面を変える Issue に「媒体を更新しない」と書くと、`launch.ts` の撮影と食い違ってレビューが止まる。媒体を残したい変更なら、`capture` の設定を変えるかどうかを人に尋ねる。

撮影は、`destination` の中身を、撮った媒体で置き換える。`destination` には、媒体だけを置く。撮った媒体は、受理された tree に入り、PR の本文の節 `## Media` に載る。

| 設定              | `launch.ts` の動き                                                                                                                                   | Issue に書くこと                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `capture: null`   | 撮影しない                                                                                                                                           | 媒体が要らないという合意                                                      |
| `required: true`  | 変更の種類にかかわらず、初回は必ず撮影して `destination` の媒体を置き換える                                                                          | 撮る画面と操作、`destination` の媒体が置き換わること                          |
| `required: false` | 変更が通常の Markdown だけなら撮影を省き、既存の媒体を残す。コード・設定・撮影定義・媒体など他の変更を含めば撮影し、`destination` の媒体を置き換える | 画面を変える Issue では、撮る画面と操作、`destination` の媒体が置き換わること |
