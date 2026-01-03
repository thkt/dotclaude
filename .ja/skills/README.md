# Claude Agentスキル - 使用ガイド

## 概要

このディレクトリはClaude Code用のスキルを格納しています。スキルは**ナレッジベース、ガイド、自動化ワークフロー**を提供します。

## スキルとは？

スキルは以下の用途で使用されます:

- **教育コンテンツ**: ベストプラクティス、設計原則、実装パターンの体系的ガイド
- **ナレッジベース**: プロジェクト横断で再利用可能な技術知識
- **プロジェクト固有の自動化**: 特定の環境やワークフローに特化した自動化

## コマンド、エージェント、スキル

### コマンド

**役割**: ユーザーが呼び出すワークフロー

- `/audit` → コードレビューオーケストレーション
- `/adr` → ADR作成フロー
- `/code` → TDD/RGRC実装

**特徴**: 薄いラッパー、スキルとエージェントを調整

### エージェント

**役割**: 専門的な分析/レビュー（コマンドから呼び出される）

- `performance-reviewer` → パフォーマンス分析
- `accessibility-reviewer` → アクセシビリティ検証
- `type-safety-reviewer` → 型安全性チェック

**特徴**: 特定タスクの実行、短期的、スキルを参照可能

### スキル

**役割**: ナレッジベース、ガイド、自動化

- `optimizing-performance` → 最適化知識
- `enhancing-progressively` → 設計原則
- `creating-adrs` → ADR作成ガイド
- `esa-daily-report` → プロジェクト固有の自動化

**特徴**: 永続的な知識、教育的、再利用可能

## スキルを使用するタイミング

### スキルを作成するケース

1. **教育コンテンツ**
   - 体系的なベストプラクティスの説明
   - 詳細な設計原則ガイド
   - 実装パターンコレクション

2. **ナレッジベース**
   - プロジェクト横断の技術知識
   - チームメンバーの学習リソース
   - 「なぜ」を説明するコンテンツ

3. **プロジェクト固有の自動化**
   - 環境依存のワークフロー
   - 外部API統合
   - 特定ツールの統合

4. **自動コンテキスト拡張**
   - キーワードトリガーで自動的に知識を提供
   - 会話フローで暗黙的に起動

### スキル以外を使用するケース

- **ワークフロー実行** → コマンドを使用
- **専門的レビュー** → エージェントを使用
- **一時的タスク** → 直接実行

## 完全なスキル一覧（21スキル）

| カテゴリ         | スキル名                     | 説明                                          | 使用元                                 |
| ---------------- | ---------------------------- | --------------------------------------------- | -------------------------------------- |
| **TDD/テスト**   | `generating-tdd-tests`       | TDD/RGRCサイクル、テスト設計、基礎原則        | /code, /fix                            |
| **コード品質**   | `applying-code-principles`   | SOLID、DRY、YAGNI原則                         | /code                                  |
|                  | `applying-frontend-patterns` | React/UIパターン（構造）                      | /code --frontend                       |
|                  | `integrating-storybook`      | Storybookコンポーネント開発                   | /code --storybook                      |
|                  | `enhancing-progressively`    | CSSファースト、プログレッシブエンハンスメント | /code                                  |
|                  | ↳ `frontend-design` (公式)   | ビジュアルデザイン品質（美学）                | plugin                                 |
| **レビュー**     | `reviewing-security`         | セキュリティレビュー（OWASP）                 | /audit                                 |
|                  | `reviewing-readability`      | 可読性レビュー                                | /audit                                 |
|                  | `reviewing-type-safety`      | 型安全性レビュー（TypeScript）                | /audit                                 |
|                  | `reviewing-silent-failures`  | サイレント障害検出                            | /audit                                 |
|                  | `reviewing-testability`      | テスタビリティレビュー                        | /audit                                 |
|                  | `analyzing-root-causes`      | 根本原因分析（5 Whys）                        | /audit                                 |
|                  | `optimizing-performance`     | パフォーマンス最適化                          | /audit                                 |
| **ドキュメント** | `creating-adrs`              | ADR作成ガイド                                 | /adr, /rulify                          |
|                  | `formatting-audits`          | ドキュメントフォーマット                      | /sow, /spec                            |
|                  | `documenting-architecture`   | アーキテクチャドキュメント                    | /docs:architecture                     |
|                  | `documenting-apis`           | API仕様ドキュメント                           | /docs:api                              |
|                  | `documenting-domains`        | ドメイン理解ドキュメント                      | /docs:domain                           |
|                  | `setting-up-docs`            | 環境セットアップガイド                        | /docs:setup                            |
| **自動化**       | `automating-browser`         | インタラクティブブラウザ制御（デモ、GIF）     | /e2e                                   |
|                  | ↳ `webapp-testing` (公式)    | Playwright E2Eテスト（CI/CD）                 | plugin                                 |
|                  | `utilizing-cli-tools`        | CLIツール（gh、git等）                        | /commit, /pr, /branch, /issue, /rabbit |
|                  | `creating-hooks`             | カスタムフック作成                            | /hookify                               |

### 命名規則

- **形式**: 動名詞形式（gerund form）- 例: `generating-*`, `applying-*`, `creating-*`
- **理由**: スキル（能力）を表現する〜ing形式が適切
- **一貫性**: ディレクトリ名とdependencies配列で同一名を使用

---

## スキル作成ガイドライン

### 構造レベル

スキルの複雑さに基づく3つの構造レベル:

#### ミニマル（知識のみのスキル）

```text
skills/
└── your-skill-name/
    └── SKILL.md          # メイン定義ファイルのみ
```

**ユースケース**: シンプルなベストプラクティスガイド、用語集など

#### スタンダード（ほとんどのスキル）

```text
skills/
└── your-skill-name/
    ├── SKILL.md          # メイン定義ファイル
    └── references/       # 外部ドキュメント参照
```

**ユースケース**: 外部ドキュメントや参照を持つガイド

#### コンプリヘンシブ（複雑なスキル）

```text
skills/
└── your-skill-name/
    ├── SKILL.md          # メイン定義ファイル
    ├── references/       # 外部ドキュメント参照
    ├── scripts/          # 自動化スクリプト
    └── assets/           # テンプレート、設定ファイル
```

**ユースケース**: 自動化、テンプレート生成を持つ高機能スキル
**例**: creating-adrs、generating-tdd-tests

### Frontmatter仕様

#### 必須フィールド

```yaml
---
name: your-skill-name # ディレクトリ名と一致必須
description: >
  スキルの目的と機能の簡潔な説明。
  トリガーキーワードを含める（例: "ADR", "decision record", "技術選定"）
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---
```

### 言語サポート（EN/JP同期）

#### 基本ルール

| 項目       | 要件                                         |
| ---------- | -------------------------------------------- |
| EN版       | **必須** - 常に英語版を最初に作成            |
| JP版       | **推奨** - 日本語ユーザー向けに作成          |
| 構造の同期 | 両方存在する場合、セクション構造を一致させる |

#### ディレクトリ構造

```text
~/.claude/skills/your-skill/SKILL.md        # EN版（必須）
~/.claude/ja/skills/your-skill/SKILL.md     # JP版（推奨）
```

### 品質チェックリスト

スキル作成/更新時にチェック:

#### 構造チェック

- [ ] `name`フィールドがディレクトリ名と一致
- [ ] `description`にトリガーキーワードを含む
- [ ] `allowed-tools`に必要なツールをリスト

#### コンテンツチェック

- [ ] 「目的」セクションが明確
- [ ] 「使用方法」セクションに具体例あり
- [ ] すべてのリファレンスリンクが有効

#### 統合チェック

- [ ] 関連コマンドからの参照が動作
- [ ] 関連エージェントとの統合が動作
- [ ] EN/JP構造が一致（両方存在する場合）

## FAQ

### Q: スキルとエージェントの違いは？

**スキル**: 永続的な知識、教育コンテンツ、暗黙的トリガー
**エージェント**: 特定タスクの実行、明示的呼び出し、短期的

### Q: スキルを作成すべきタイミングは？

以下の条件が当てはまる場合:

- プロジェクト横断で再利用可能
- 「なぜ」を説明する教育的価値がある
- チームメンバーの学習リソースになる
- キーワードベースの自動トリガーが有用

### Q: コマンドとの違いは？

**コマンド**: ユーザーが明示的に呼び出すワークフロー実行
**スキル**: 知識提供、コマンドから参照される、または自動トリガー

## 関連ドキュメント

- [COMMANDS.md](../docs/COMMANDS.md) - コマンド詳細
- [CLAUDE.md](../CLAUDE.md) - グローバル設定とルール

## メンテナンス

### 定期レビュー

- **月次**: スキル使用頻度をチェック
- **四半期**: コンテンツの陳腐化をチェック
- **随時**: 新しい知識とベストプラクティスを追加

### 更新の注意点

1. **SKILL.md変更**: descriptionやトリガーキーワードを更新
2. **テンプレート変更**: 後方互換性を考慮
3. **依存関係**: コマンドとエージェントへの影響を確認

---

**最終更新**: 2025-12-26
