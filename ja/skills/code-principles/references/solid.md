# SOLID原則 - Robert C. Martinのように

Uncle Bobのようにコードを設計し構造化する - 5つの基本原則を通じて柔軟で保守可能なシステムを作成する。

## 核心哲学

**依存関係を管理する**：依存関係の方向と流れを制御
**変更を可能にする**：壊さずに修正しやすいコード
**プロフェッショナルな職人技**：他の開発者が尊重するコードを書く

## 5つの原則

### 1. 単一責任の原則（SRP）

クラスは変更する理由を1つだけ持つべき

```typescript
// ✅ 良い例：単一責任
class UserValidator {
  validate(user: User): ValidationResult
}

// ❌ 悪い例：複数の責任
class User {
  validate(): boolean
  save(): void
  sendEmail(): void
}
```

理由：複数の変更理由 = 脆いコード

### 2. オープン・クローズドの原則（OCP）

拡張に対して開き、修正に対して閉じている

```typescript
// ✅ 良い例：インターフェースを通じて拡張
interface PaymentProcessor {
  process(amount: number): Result
}
class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}

// ❌ 悪い例：既存コードを修正
if (type === 'stripe') { /* stripe logic */ }
else if (type === 'paypal') { /* paypal logic */ }
```

理由：新機能が既存コードを壊すべきではない

### 3. リスコフの置換原則（LSP）

サブタイプは基本型で置換可能でなければならない

```typescript
// ✅ 良い例：DuckはBirdのように飛べる
class Bird { fly() {} }
class Duck extends Bird { fly() { /* duck flying */ } }

// ❌ 悪い例：PenguinがBirdの契約を破る
class Penguin extends Bird {
  fly() { throw new Error("Can't fly") }
}
```

理由：継承の驚き = バグ

### 4. インターフェース分離の原則（ISP）

汎用的な1つのインターフェースより、多くの特化したインターフェース

```typescript
// ✅ 良い例：焦点を絞ったインターフェース
interface Readable { read(): Data }
interface Writable { write(data: Data): void }

// ❌ 悪い例：肥大化したインターフェース
interface FileOps {
  read(): Data
  write(data: Data): void
  delete(): void
  compress(): void
}
```

理由：不必要な依存関係を強制しない

### 5. 依存性逆転の原則（DIP）

具象ではなく抽象に依存する

```typescript
// ✅ 良い例：インターフェースに依存
constructor(private logger: Logger) {}

// ❌ 悪い例：実装に依存
constructor(private fileLogger: FileLogger) {}
```

理由：高レベルのポリシーは低レベルの詳細に依存すべきではない

## 適用すべき場合

- クラス/モジュールの設計
- API境界
- リファクタリングの決定
- アーキテクチャ計画

## クイック決定ガイド

- 新機能？ → まずOCPを確認
- クラスが大きすぎる？ → SRPを適用
- 継承の問題？ → LSPを検証
- メソッドが多すぎる？ → ISPを検討
- テストが困難？ → DIPを適用

## 他の原則との統合

- TDDとの組み合わせ：テストを通じて設計が出現
- DRYとの組み合わせ：抽象化が重複を防ぐ
- Tidyingsとの組み合わせ：SOLIDに向けてリファクタリング

## 覚えておくこと

「速く進む唯一の方法は、良く進むこと」 - クリーンなアーキテクチャがスピードを可能にする
