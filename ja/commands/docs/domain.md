---
description: コードベース解析によるドメイン理解ドキュメントを自動生成
aliases: [domain-docs]
---

# /docs:domain - ドメイン理解ドキュメント生成

## 概要

コードベースを解析し、ドメイン理解ドキュメントを自動生成します。

## 使用方法

```bash
# 現在のディレクトリを解析
/docs:domain

# 特定のディレクトリを解析
/docs:domain src/

# 出力先を指定
/docs:domain --output docs/DOMAIN.md
```

## オプション

| オプション | 説明 | デフォルト |
| --- | --- | --- |
| `path` | 解析対象ディレクトリ | カレントディレクトリ |
| `--output` | 出力ファイルパス | `.claude/workspace/docs/domain.md` |
| `--format` | 出力形式 | `markdown` |

## 生成内容

- **ドメインエンティティ** - 主要なビジネスオブジェクト
- **用語集** - ドメイン固有の用語定義
- **ER図** - エンティティ関係図（Mermaid形式）
- **ビジネスルール** - 重要な制約・ルール

## 実行フロー

### フェーズ1: エンティティ抽出

```bash
~/.claude/skills/documenting-domains/scripts/extract-entities.sh {path}
```

### フェーズ2: 用語集生成

```bash
~/.claude/skills/documenting-domains/scripts/extract-glossary.sh {path}
```

### フェーズ3: ER図生成

```bash
~/.claude/skills/documenting-domains/scripts/generate-er-diagram.sh {path}
```

### フェーズ4: ドキュメント生成

テンプレートに解析結果を埋め込み、Markdownドキュメントを生成。

### フェーズ5: Markdown検証

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。非ブロッキング（警告のみ）。

## 出力例

```markdown
# プロジェクト名 - ドメイン理解

## エンティティ

### User
ユーザーを表すエンティティ

| プロパティ | 型 | 説明 |
| --- | --- | --- |
| id | string | 一意識別子 |
| email | string | メールアドレス |

## 用語集

| 用語 | 定義 |
| --- | --- |
| テナント | サービス利用組織 |

## エンティティ関係図

(Mermaid ER図)
```

## エラーハンドリング

| エラー | 対処 |
| --- | --- |
| エンティティ未検出 | 汎用テンプレートを使用 |
| ER図生成失敗 | 警告を表示して続行 |

## 関連

- **兄弟コマンド**: `/docs:architecture`, `/docs:setup`, `/docs:api`
