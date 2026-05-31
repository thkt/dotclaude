# Common Pitfalls

外部ツールおよび言語のエッジケース制約。実装前に対象の命名・書式ルールを確認する。エラー時はまず制約違反を疑い、類似ケースをスキャンする。

バックエンドランタイムの危険箇所 (N+1、ページング欠落、楽観ロック skew) など、安全策の欠落が本番インシデントを定常的に引き起こすケースもカバーする。

| #   | ツール/コンテキスト    | 落とし穴                                                                                                                        | 検証                                                       |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Git ブランチ/タグ      | `[` `]` `~` `^` `:` `\` `..` 空白は禁止                                                                                         | `git check-ref-format --branch "name"`                     |
| 2   | npm package 名         | 最大 214 文字、小文字強制、`@scope/` 形式                                                                                       | `npm info package-name`                                    |
| 3   | Docker イメージ/タグ   | 小文字のみ、`/` は名前空間、`:` はタグ                                                                                          | 公式ドキュメントを確認                                     |
| 4   | 正規表現エンジン       | PCRE vs ERE vs BRE vs JavaScript の差異                                                                                         | 使用エンジンの `--help` を確認                             |
| 5   | macOS ファイル名       | `:` 禁止、デフォルトで大文字小文字無視                                                                                          | `touch "test:file"` でエラーを確認                         |
| 6   | semver バージョン      | `MAJOR.MINOR.PATCH` 必須、先頭の `v` は別物                                                                                     | `npx semver "version"` で検証                              |
| 7   | 環境変数名             | 英数と `_` のみ、先頭は数字不可                                                                                                 | `export` で既存確認、POSIX 準拠                            |
| 8   | JSON キー名            | ダブルクォート必須、末尾カンマ禁止                                                                                              | `jq . file.json` でパースエラーを確認                      |
| 9   | ループ内 DB query      | N+1 パターン。バッチ取得 + `Map` グループ化に置換。未使用の `include` は削除                                                    | `EXPLAIN ANALYZE` とクエリログで反復パターンを確認         |
| 10  | `await` チェーン       | 独立した `await` は直列実行。`Promise.all()` を使う。部分失敗を許容するなら `Promise.allSettled()`                              | 連続する `await` を grep、プロファイラのタイムラインを確認 |
| 11  | List エンドポイント    | ページング欠落。`limit`/`offset` + 上限検証 (default 100) を必須化                                                              | ハンドラと OpenAPI を確認、無制限のリスト返却を拒否        |
| 12  | 並行更新               | 楽観ロックなし。`version` カラム追加、`WHERE` に含める、不一致時 409 返却。`version === undefined` で確認 (`!version` ではない) | schema と `UPDATE ... WHERE` 句を確認                      |
| 13  | grep/ugrep alternation | grep BRE は `\|` で alternation、ugrep ERE default は `|` で alternation (`\|` はリテラル)。0件返したら syntax の不一致を疑う   | テスト用の既知 symbol で alternation の動作を確認          |
