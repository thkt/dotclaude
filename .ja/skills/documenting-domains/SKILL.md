---
name: documenting-domains
description: コードベース分析からドメインドキュメントを生成 - エンティティ、用語集、関係。
allowed-tools: [Read, Write, Grep, Glob, Bash, Task]
context: fork
user-invocable: false
---

# ドメイン理解生成

コードベース分析からドメインドキュメントを自動生成。

## 検出項目

| カテゴリ         | 対象                                          |
| ---------------- | --------------------------------------------- |
| エンティティ     | class, interface, dataclass, Prisma, ORM      |
| 不変条件         | バリデーションロジック、制約、必須フィールド  |
| ドメイン用語     | クラス/関数名、コメント、JSDoc                |
| 関係             | エンティティ参照、継承、インポート            |
| ビジネスルール   | バリデータ、ポリシー、ドメインサービス        |
| ドメインイベント | イベントクラス、EventEmitter、pub/subパターン |

## 検出パターン

| ORM/フレームワーク | パターン                   |
| ------------------ | -------------------------- |
| Prisma             | `model User {}`            |
| TypeORM            | `@Entity()`, `@Column()`   |
| Sequelize          | `Model.init()`             |
| Django             | `class User(models.Model)` |
| SQLAlchemy         | `class User(Base)`         |

## 品質基準

| 基準                             | 目標 |
| -------------------------------- | ---- |
| ドメイン用語が非開発者にも明確   | ✓    |
| エンティティの不変条件が文書化   | ✓    |
| 関係がER図で可視化されている     | ✓    |
| ビジネスルールがコードに追跡可能 | ✓    |
