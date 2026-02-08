---
name: documenting-domains
description: コードベース分析からドメインドキュメントを生成
tools: [Read, Write, Grep, Glob, Task]
context: fork
user-invocable: false
---

# ドメインドキュメント生成

## アプローチ: スキーマファースト

エンティティ/モデルファイルを信頼の源として Read する。

| 優先度 | ソース                | 方法                                |
| ------ | --------------------- | ----------------------------------- |
| 1      | ORMスキーマファイル   | ファイル全文 Read、エンティティ解析 |
| 2      | 型/クラスファイル     | ファイル全文 Read、フィールド抽出   |
| 3      | Grep（フォールバック）| 発見のみ、フィールド値の取得は不可  |

## 検出

| カテゴリ         | 対象                                          |
| ---------------- | --------------------------------------------- |
| エンティティ     | class, interface, dataclass, Prisma, ORM      |
| 不変条件         | バリデーションロジック、制約、必須フィールド  |
| ドメイン用語     | クラス/関数名、コメント、JSDoc                |
| 関連             | エンティティ参照、継承、import                |
| ビジネスルール   | バリデータ、ポリシー、ドメインサービス        |
| ドメインイベント | イベントクラス、EventEmitter、pub/subパターン |

## ORM抽出ルール

| ORM/フレームワーク | エンティティ検出             | フィールド抽出               | 不変条件検出                          |
| ------------------ | ---------------------------- | ---------------------------- | ------------------------------------- |
| Prisma             | `model EntityName {`         | `fieldName Type @annotation` | `@unique`, `@default`, `@@index`      |
| TypeORM            | `@Entity()` class            | `@Column()` property         | `@Check()`, クラスバリデータ          |
| Sequelize          | `Model.init({...})`          | init config 内のプロパティ   | `validate:` オプション                |
| Drizzle            | `pgTable()`, `sqliteTable()` | カラム定義                   | `.notNull()`, `.unique()`             |
| Django             | `class X(models.Model)`      | `models.CharField(...)` 等   | `validators=`, `unique=True`          |
| SQLAlchemy         | `class X(Base)`              | `Column(Type, ...)` 宣言     | `CheckConstraint`, `UniqueConstraint` |
| 汎用               | `class X` / `interface X`    | プロパティ宣言 + 型          | メソッド内の throw/assert/validate    |

## スキーマ読み取り

| ルール           | 詳細                                          |
| ---------------- | --------------------------------------------- |
| ファイル全文読み | フィールド値の grep 取得は不可                |
| 全フィールド取得 | 「重要な」ものだけでなく全フィールド          |
| 制約の保持       | NOT NULL, required, @IsNotEmpty, バリデータ   |
| 正確な型名保持   | 定義通りの型名を使用、正規化しない            |
| enum値           | 宣言順で全値を抽出                            |
| ソース位置       | 各エンティティとフィールドの file:line を記録 |

## 信頼度

| 証拠                   | レベル   |
| ---------------------- | -------- |
| スキーマ + バリデータ  | verified |
| スキーマファイルのみ   | verified |
| 型/クラス定義          | inferred |
| Grepマッチのみ         | unknown  |
