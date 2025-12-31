---
description: コードベース分析からドメイン理解ドキュメントを生成
aliases: [domain-docs]
---

# /docs:domain - ドメイン理解ドキュメント生成

## 概要

コードベースを分析し、ドメイン理解ドキュメントを自動生成。

## 使用方法

```bash
# カレントディレクトリを分析
/docs:domain

# 特定ディレクトリを分析
/docs:domain src/

# 出力先を指定
/docs:domain --output docs/DOMAIN.md
```

## オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `path` | 分析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/domain-glossary.md` |
| `--format` | 出力形式 | `markdown` |

## 生成コンテンツ

- **エンティティ一覧** - データモデル、ドメインオブジェクト
- **概念関係図** - Mermaid ER図によるエンティティ関係
- **ドメイン用語集** - プロジェクト固有の用語と説明
- **ユースケース一覧** - Service/UseCase/Handlerクラス
- **ビジネスルール** - ドメインロジックの概要

## 検出対象

### エンティティ/モデル

| フレームワーク | 検出パターン |
| --- | --- |
| TypeScript | `class`、`interface` |
| Prisma | `model`定義 |
| TypeORM | `@Entity`デコレーター |
| SQLAlchemy | `Base`サブクラス |
| Django | `models.Model`サブクラス |

### ビジネスロジック

| パターン | 説明 |
| --- | --- |
| `*Service*` | サービスクラス |
| `*UseCase*` | ユースケースクラス |
| `*Handler*` | ハンドラークラス |
| `domain/` | ドメイン層ディレクトリ |

### ドメイン用語

- クラス名（CamelCase → 用語）
- 関数名（動詞 + 名詞パターン）
- コメント/docstringからの説明

## 実行フロー

### フェーズ1: エンティティ抽出

```bash
~/.claude/skills/documenting-domains/scripts/extract-entities.sh {path}
```

### フェーズ2: 用語集抽出

```bash
~/.claude/skills/documenting-domains/scripts/extract-glossary.sh {path}
```

### フェーズ3: ER図生成

```bash
~/.claude/skills/documenting-domains/scripts/generate-er-diagram.sh {path}
```

### フェーズ4: ドキュメント生成

検出結果をテンプレート（`~/.claude/skills/documenting-domains/assets/domain-template.md`）に埋め込み、Markdownドキュメントを生成。

### フェーズ5: Markdownバリデーション

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。ブロッキングなし（警告のみ）。

## 出力例

```markdown
# ドメイン理解ドキュメント

## エンティティ一覧

| エンティティ | 説明 | 関連 |
|--------|-------------|---------|
| User | ユーザー情報 | Order, Profile |
| Order | 注文情報 | User, Product |
| Product | 商品情報 | Order, Category |

## 概念関係図

\`\`\`mermaid
erDiagram
    User ||--o{ Order : places
    Order ||--|{ Product : contains
    Product }|--|| Category : belongs_to
\`\`\`

## ドメイン用語集

| 用語 | 説明 |
| --- | --- |
| User | システムユーザー |
| Order | 商品注文 |
```

## エラーハンドリング

| エラー | アクション |
| --- | --- |
| エンティティ未検出 | 汎用パターンで再検索 |
| Prisma未使用 | TypeScript分析にフォールバック |
| README未検出 | 概要セクションをスキップ |

## 関連

- **関連コマンド**: `/docs:architecture`、`/docs:setup`、`/docs:api`
