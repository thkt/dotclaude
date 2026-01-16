# Architecture Decision Records

Claude Codeプラグインのアーキテクチャ決定を記録するドキュメント。

## ADR一覧

| ADR                                                        | タイトル                           | ステータス |
| ---------------------------------------------------------- | ---------------------------------- | ---------- |
| [0001](./0001-code-command-responsibility-separation.md)   | code.md コマンドの責任分離         | accepted   |
| [0002](./0002-fix-modularization-and-tdd-commonization.md) | /fix モジュール化とTDD共通化       | accepted   |
| [0003](./0003-marketplace.md)                              | Marketplace構造の維持              | accepted   |
| [0004](./0004-skill-centric-architecture-restructuring.md) | スキル中心アーキテクチャへの再構成 | accepted   |
| [0005](./0005-documentation-role-separation.md)            | ドキュメントの役割分離とAI最適化   | accepted   |

## 関連ルール

ADRから抽出された強制ルール：

- [MODULARIZATION_RULES.md](../rules/workflows/MODULARIZATION_RULES.md) - ADR 0001, 0002
- [PLUGIN_ARCHITECTURE.md](../rules/conventions/PLUGIN_ARCHITECTURE.md) - ADR 0003

## 参照

- [MADR Format](https://adr.github.io/madr/)
- `/adr` コマンドで新規ADR作成
- `/rulify` コマンドでADRからルール生成
