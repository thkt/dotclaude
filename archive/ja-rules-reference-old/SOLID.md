# SOLID原則 - Robert C. Martinのように

アンクル・ボブのようにコードを設計・構造化 - 5つの基本原則を通じて柔軟で保守可能なシステムを作成。

## 核心哲学

**依存関係を管理**: 依存関係の方向と流れを制御
**変更を可能に**: 壊さずに修正しやすいコード
**プロフェッショナルな職人技**: 他の開発者が尊重するコードを書く

## 5つの原則

### 1. 単一責任原則 (SRP)

クラスには変更する理由が1つだけであるべき

```typescript
// ✅ 良い: 単一責任
class UserValidator {
  validate(user: User): ValidationResult
}

// ❌ 悪い: 複数の責任
class User {
  validate(): boolean
  save(): void
  sendEmail(): void
}
```

理由: 変更理由が複数 = 脆いコード

### 2. 開放閉鎖原則 (OCP)

拡張に開き、修正に閉じる

```typescript
// ✅ 良い: インターフェースを通じて拡張
interface PaymentProcessor {
  process(amount: number): Result
}
class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}

// ❌ 悪い: 既存コードを修正
if (type === 'stripe') { /* stripe logic */ }
else if (type === 'paypal') { /* paypal logic */ }
```

理由: 新機能は既存コードを壊すべきでない

### 3. リスコフの置換原則 (LSP)

サブタイプは基底型と置換可能でなければならない

```typescript
// ✅ 良い: DuckはBirdのように飛べる
class Bird { fly() {} }
class Duck extends Bird { fly() { /* duck flying */ } }

// ❌ 悪い: PenguinはBirdの契約を破る
class Penguin extends Bird {
  fly() { throw new Error("Can't fly") }
}
```

理由: 継承のサプライズ = バグ

### 4. インターフェース分離原則 (ISP)

1つの汎用インターフェースより多くの特定インターフェース

```typescript
// ✅ 良い: 焦点を絞ったインターフェース
interface Readable { read(): Data }
interface Writable { write(data: Data): void }

// ❌ 悪い: 太ったインターフェース
interface FileOps {
  read(): Data
  write(data: Data): void
  delete(): void
  compress(): void
}
```

理由: 不必要な依存関係を強制しない

### 5. 依存性逆転原則 (DIP)

具象ではなく抽象に依存

```typescript
// ✅ 良い: インターフェースに依存
constructor(private logger: Logger) {}

// ❌ 悪い: 実装に依存
constructor(private fileLogger: FileLogger) {}
```

理由: 高レベルポリシーは低レベル詳細に依存すべきでない

## 適用するタイミング

- クラス/モジュール設計
- API境界
- リファクタリング決定
- アーキテクチャ計画

## クイック判断ガイド

- 新機能？ → まずOCPを確認
- クラスが大きすぎる？ → SRPを適用
- 継承の問題？ → LSPを検証
- メソッドが多すぎる？ → ISPを検討
- テストしにくい？ → DIPを適用

## 他の原則との統合

- TDDと: テストを通じて設計が浮かび上がる
- DRYと: 抽象化が重複を防ぐ
- Tidyingsと: SOLIDに向けてリファクタリング

## 覚えておくこと

「速く行く唯一の方法は、うまくやることだ」 - クリーンアーキテクチャがスピードを可能にする

## 関連する原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#参照原則)
