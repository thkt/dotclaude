# /census 検出対象

Step 2 はファイルパターン、Step 4 は決定動詞をスキャンする。

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

## 決定動詞 (Step 4)

検出したドキュメント内で、以下の動詞を含む文を候補化する。

- 英語: `decide`, `choose`, `adopt`, `reject`, `deprecate`, `must not`, `never`, `always`
- 日本語: `決定`, `採用`, `禁止`, `方針`, `選定`, `排除`, `従う`, `規約`
