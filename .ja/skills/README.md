# スキル

Claude Codeのナレッジベース、ガイド、自動化ワークフローを提供します。

## スキル一覧 (21スキル)

| カテゴリ         | スキル                       | 説明                         | 使用元                |
| ---------------- | ---------------------------- | ---------------------------- | --------------------- |
| **TDD/テスト**   | `generating-tdd-tests`       | TDD/RGRCサイクル、テスト設計 | /code, /fix           |
| **コード品質**   | `applying-code-principles`   | SOLID, DRY, YAGNI原則        | /code                 |
|                  | `applying-frontend-patterns` | React/UIパターン             | /code --frontend      |
|                  | `integrating-storybook`      | Storybook開発                | /code --storybook     |
|                  | `enhancing-progressively`    | CSS優先アプローチ            | /code                 |
| **レビュー**     | `reviewing-security`         | セキュリティレビュー(OWASP)  | /audit                |
|                  | `reviewing-readability`      | 可読性レビュー               | /audit                |
|                  | `reviewing-type-safety`      | 型安全性(TypeScript)         | /audit                |
|                  | `reviewing-silent-failures`  | サイレント障害検出           | /audit                |
|                  | `reviewing-testability`      | テスタビリティレビュー       | /audit                |
|                  | `analyzing-root-causes`      | 根本原因分析(5 Whys)         | /audit                |
|                  | `optimizing-performance`     | パフォーマンス最適化         | /audit                |
| **ドキュメント** | `creating-adrs`              | ADR作成(MADR)                | /adr, /rulify         |
|                  | `formatting-audits`          | ドキュメント書式             | /sow, /spec           |
|                  | `documenting-architecture`   | アーキテクチャドキュメント   | skill                 |
|                  | `documenting-apis`           | API仕様                      | skill                 |
|                  | `documenting-domains`        | ドメイン理解                 | skill                 |
|                  | `setting-up-docs`            | 環境セットアップガイド       | skill                 |
| **自動化**       | `automating-browser`         | ブラウザ操作(デモ、GIF)      | /e2e                  |
|                  | `utilizing-cli-tools`        | CLIツール(gh, git)           | /commit, /pr, /branch |
|                  | `creating-hooks`             | カスタムフック作成           | /hookify              |

## 命名規則

**形式**: 動名詞形 (verb-ing)

| パターン | 例                                                        |
| -------- | --------------------------------------------------------- |
| 良い     | `generating-*`, `applying-*`, `creating-*`, `reviewing-*` |
| 避ける   | `helper`, `utils`, `tools` (曖昧すぎる)                   |

## 新規スキル作成

参照: [SKILL_FORMAT_GUIDE.md](./SKILL_FORMAT_GUIDE.md)

## 関連

- [COMMANDS.md](../docs/COMMANDS.md) - コマンドリファレンス
- [CLAUDE.md](../CLAUDE.md) - グローバル設定
