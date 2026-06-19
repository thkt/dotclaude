# /census 検出対象

Step 2 はファイルパターンをスキャンする。Step 3 (commit メッセージ) と Step 4 (ドキュメント散文) は決定動詞をスキャンする。

| ファイルパターン                                                 | 含まれやすい内容                 |
| ---------------------------------------------------------------- | -------------------------------- |
| `README.md`                                                      | 設計意図、命名、禁止事項         |
| `CONTRIBUTING.md`                                                | コードスタイル決定、ワークフロー |
| `SECURITY.md`                                                    | 脅威境界、セキュリティ方針       |
| `THREAT_MODEL.md`                                                | 信頼境界、緩和策                 |
| `ARCHITECTURE.md`                                                | モジュール分解、レイヤ方針       |
| `DESIGN.md` / `*.design.md`                                      | コンポーネントの設計根拠         |
| `CLAUDE.md` / `AGENTS.md`                                        | AI エージェント運用判断          |
| `Makefile` / `justfile`                                          | ビルドフローの判断               |
| Lint 設定 (`Cargo.toml` `[lints.*]`, `.eslintrc`, `oxlint.json`) | ルール選定の根拠                 |

## 決定動詞 (Step 3 / Step 4)

検出したドキュメント、または commit メッセージ内で、以下の動詞を含む文を候補化する。

| 種類 | 英語                        | 日本語               |
| ---- | --------------------------- | -------------------- |
| 選択 | `decide` `choose` `adopt`   | `決定` `採用` `選定` |
| 拒否 | `reject` `deprecate`        | `禁止` `排除`        |
| 義務 | `must not` `never` `always` | `方針` `従う` `規約` |
