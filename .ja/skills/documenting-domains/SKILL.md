---
name: documenting-domains
description: >
  コードベース分析からドメイン理解ドキュメントを生成。
  エンティティ、ビジネスロジック、ドメイン用語、概念関係を抽出。
  トリガー: domain understanding, glossary, entities, business logic,
  domain model, ER diagram, use cases.
allowed-tools: Read, Write, Grep, Glob, Bash, Task
---

# docs:domain - ドメイン理解生成

コードベース分析からドメインドキュメントを自動生成。

## 検出項目

| カテゴリ | 対象 |
| --- | --- |
| エンティティ/モデル | class, interface, dataclass, Pydantic, Prisma, TypeORM, SQLAlchemy |
| ドメイン用語 | クラス/関数名、コメント、JSDoc、docstrings |
| 関係 | エンティティ参照、継承、インポート分析 |
| ユースケース | Service/UseCaseクラス、Handler/Controller関数 |

## 分析スクリプト

| スクリプト | 目的 |
| --- | --- |
| `scripts/extract-entities.sh` | エンティティ名、フィールド、関係 |
| `scripts/extract-glossary.sh` | 用語、頻度、コンテキスト |
| `scripts/generate-er-diagram.sh` | Mermaid ER図 |

## 生成構造

```markdown
# ドメイン理解ドキュメント

## エンティティ一覧
### User
- id: string
- name: string
関連: Order, Profile

## 概念関係図
（Mermaid ER図）

## ドメイン用語集
| 用語 | 説明 | 関連 |

## ユースケース一覧
| ユースケース | 説明 | エンティティ |
```

## 使用方法

```bash
/docs:domain              # ドメインドキュメント生成
"Generate domain glossary" # 自然言語
```

## Markdownバリデーション

生成後、出力を検証:

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

ブロッキングなし（警告のみ） - スタイル問題はドキュメント作成をブロックしない。

## 参照

- 関連: `documenting-architecture`, `documenting-apis`, `setting-up-docs`
