# Architecture Decision Records

Claude Codeプラグインのアーキテクチャ決定を記録するドキュメント。

## ADR一覧

| ADR                                                                  | タイトル                              | ステータス |
| -------------------------------------------------------------------- | ------------------------------------- | ---------- |
| [0001](./0001-code-command-responsibility-separation.md)             | code.md コマンドの責任分離            | accepted   |
| [0002](./0002-fix-modularization-and-tdd-commonization.md)           | /fix モジュール化とTDD共通化          | accepted   |
| [0003](./0003-marketplace.md)                                        | Marketplace構造の維持                 | accepted   |
| [0004](./0004-skill-centric-architecture-restructuring.md)           | スキル中心アーキテクチャへの再構成    | accepted   |
| [0005](./0005-documentation-role-separation.md)                      | ドキュメントの役割分離とAI最適化      | accepted   |
| [0006](./0006-adopt-deterministic-script-pattern.md)                 | 決定論的処理のスクリプト化パターン    | accepted   |
| [0007](./0007-configuration-optimization.md)                         | Claude Code 設定の最適化              | proposed   |
| [0008](./0008-audience-optimized-templates.md)                       | 読み手別テンプレート最適化            | accepted   |
| [0009](./0009-externalize-idr-as-rust-binary.md)                     | IDR生成の外部リポジトリ化（Rust）     | accepted   |
| [0010](./0010-schema-first-api-documentation.md)                     | Schema-First APIドキュメント生成      | accepted   |
| [0011](./0011-add-evidence-verifier-to-audit-pipeline.md)            | Audit に Evidence Verifier を追加     | accepted   |
| [0012](./0012-flatten-audit-pipeline-remove-compound-reviewers.md)   | Audit パイプラインのフラット化        | accepted   |
| [0013](./0013-adopt-hook-trinity-pattern-with-claude-reviews.md)     | Hook Trinity — claude-reviews 採用    | accepted   |
| [0014](./0014-integrate-aidlc-design-separation-and-ops-reviewer.md) | AI-DLC 統合 — 設計分離と Ops Reviewer | accepted   |
| [0015](./0015-frontend-security-guardrails-strategy.md)              | フロントエンドセキュリティ戦略        | accepted   |

## 関連ルール

ADRから抽出された強制ルール：

- [MODULARIZATION_RULES.md](../rules/workflows/MODULARIZATION_RULES.md) - ADR 0001, 0002
- [PLUGIN_ARCHITECTURE.md](../rules/conventions/PLUGIN_ARCHITECTURE.md) - ADR 0003

## 参照

- [MADR Format](https://adr.github.io/madr/) — 簡略版を使用（Pros/Cons は Consequences セクションに統合）
- `/adr` コマンドで新規ADR作成
