<!-- /census Step 2 の検出対象。トップ階層と docs/ 配下からこれらをスキャンする。 -->

| ファイルパターン                                                   | 含まれやすい内容                 |
| ------------------------------------------------------------------ | -------------------------------- |
| `README.md`                                                        | 設計意図、命名、禁止事項         |
| `CONTRIBUTING.md`                                                  | コードスタイル決定、ワークフロー |
| `SECURITY.md`                                                      | 脅威境界、セキュリティ方針       |
| `THREAT_MODEL.md`                                                  | 信頼境界、緩和策                 |
| `ARCHITECTURE.md`                                                  | モジュール分解、レイヤ方針       |
| `DESIGN.md` / `*.design.md`                                        | コンポーネント rationale         |
| `CLAUDE.md` / `AGENTS.md`                                          | AI エージェント運用判断          |
| `Makefile` / `justfile`                                            | ビルドフローの判断               |
| Linter 設定 (`Cargo.toml` `[lints.*]`, `.eslintrc`, `oxlint.json`) | ルール選定の rationale           |
