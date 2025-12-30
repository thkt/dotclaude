---
name: documenting-domains
description: >
  Generate domain understanding documentation from codebase analysis.
  Extracts entities, business logic, domain terms, and concept relationships.
  コードベースからドメイン理解ドキュメントを生成します。
  エンティティ、ビジネスロジック、ドメイン用語、概念関係を抽出します。
allowed-tools: Read, Write, Grep, Glob, Bash, Task

triggers:
  keywords:
    - "ドメイン理解"
    - "domain understanding"
    - "用語集"
    - "glossary"
    - "エンティティ"
    - "entities"
    - "ビジネスロジック"
    - "business logic"
---

# docs:domain スキル

ドメイン理解ドキュメントを自動生成するスキル。

## 機能

### 検出項目

1. **エンティティ/モデル**
   - TypeScript: class, interface（データ構造）
   - Python: dataclass, Pydantic Model
   - データベースモデル（Prisma, TypeORM, SQLAlchemy）

2. **ドメイン用語**
   - クラス名、関数名から抽出
   - コメント/JSDoc/docstringから説明を抽出
   - CamelCase/snake_caseを分解して用語化

3. **概念関係**
   - エンティティ間の参照関係
   - 継承関係
   - 依存関係（import文解析）

4. **ユースケース/サービス**
   - Service/UseCase クラス
   - Handler/Controller 関数
   - ビジネスロジックを含むモジュール

## 解析スクリプト

### extract-entities.sh

エンティティとモデルを抽出：

```bash
~/.claude/skills/documenting-domains/scripts/extract-entities.sh {path}
```

**出力:**

- エンティティ名
- フィールド一覧
- 関連エンティティ

### extract-glossary.sh

ドメイン用語を抽出：

```bash
~/.claude/skills/documenting-domains/scripts/extract-glossary.sh {path}
```

**出力:**

- 用語
- 出現頻度
- コンテキスト

### generate-er-diagram.sh

概念関係図（Mermaid ER図）を生成：

```bash
~/.claude/skills/documenting-domains/scripts/generate-er-diagram.sh {path}
```

## 生成ドキュメント構成

```markdown
# ドメイン理解ドキュメント

## 概要
プロジェクトのビジネスドメインの説明

## エンティティ一覧
### User
- id: string
- name: string
- email: string
関連: Order, Profile

## 概念関係図
（Mermaid ER図）

## ドメイン用語集
| 用語 | 説明 | 関連エンティティ |
|------|------|-----------------|

## ユースケース一覧
| ユースケース | 説明 | 関連エンティティ |
|-------------|------|-----------------|
```

## Markdown検証

```bash
~/.claude/skills/scripts/validate-markdown.sh {output-file}
```

生成されたMarkdownのフォーマット問題を検証。非ブロッキング（警告のみ）。

## テンプレート

`assets/domain-template.md` - ドメイン理解ドキュメントのMarkdownテンプレート

## 使用例

```bash
# コマンドから呼び出し
/docs:domain

# スキル直接参照
「ドメイン用語集を生成して」
```

## 関連

- 兄弟スキル: `docs:architecture`, `docs:setup`, `docs:api`
- コマンド: `/docs:domain`
