---
name: documenting-domains
description: >
  コードベース分析からドメインドキュメントを生成 - エンティティ、用語集、関連。
  ドメインモデル分析、用語集作成、または
  domain model, entity diagram, ドメインモデル, 用語集, glossary, ubiquitous language に言及した時に使用。
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# ドメイン理解の生成

## 検出

| カテゴリ         | 対象                                          |
| ---------------- | --------------------------------------------- |
| エンティティ     | class, interface, dataclass, Prisma, ORM      |
| 不変条件         | バリデーションロジック、制約、必須フィールド  |
| ドメイン用語     | クラス/関数名、コメント、JSDoc                |
| 関連             | エンティティ参照、継承、import                |
| ビジネスルール   | バリデータ、ポリシー、ドメインサービス        |
| ドメインイベント | イベントクラス、EventEmitter、pub/subパターン |

## ORMパターン

| ORM/フレームワーク | パターン                   |
| ------------------ | -------------------------- |
| Prisma             | `model User {}`            |
| TypeORM            | `@Entity()`, `@Column()`   |
| Sequelize          | `Model.init()`             |
| Django             | `class User(models.Model)` |
| SQLAlchemy         | `class User(Base)`         |
