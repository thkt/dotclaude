# AIコードアンチパターン

## レッドフラグ

| パターン                   | 例                                         | 修正                    |
| -------------------------- | ------------------------------------------ | ----------------------- |
| インターフェース、1実装    | `interface X { } class DefaultX impl X`    | 関数を直接使用          |
| 1関数をラップするクラス    | `class CSVReader { read() {} }`            | シンプルな関数          |
| 1回使用のヘルパー          | `getUserName(u)` 1箇所で使用               | インライン: `user.name` |
| シンプルタスクにプラグイン | `ValidationEngine.registerValidator()`     | 直接バリデーション関数  |
| シンプル生成にファクトリ   | `UserFactory.createUser()`                 | `createUser()` 関数     |
| 静的ロジックにストラテジー | `interface DiscountStrategy { calculate }` | シンプルな条件分岐      |

## いつ使うか

| アプローチ       | 場合                                           |
| ---------------- | ---------------------------------------------- |
| 関数             | 単一操作、ステートレス、シンプルなタスク       |
| クラス           | 複数の関連操作、共有状態、明確な境界           |
| インターフェース | 2つ以上の実装が実際に存在                      |
| パターン         | 実際の問題を解決、ランタイム動作切り替えが必要 |

## 複雑さのマッチング

| タスクスコープ   | アプローチ                        |
| ---------------- | --------------------------------- |
| 単一関数         | 直接的な手続き型                  |
| ファイルレベル   | 最小限の抽象化を持つ関数          |
| モジュールレベル | 共有状態が必要な場合にクラス      |
| システムレベル   | 複数チーム/プラグイン時にパターン |

## コード例

```typescript
// Bad: 不要なファクトリ
class UserFactory {
  createUser(name, email) {
    return { name, email, createdAt: new Date() };
  }
}

// Good: シンプルな関数
function createUser(name, email) {
  return { name, email, createdAt: new Date() };
}
```

```typescript
// Bad: 静的ロジックにストラテジーパターン
interface DiscountStrategy {
  calculate(amount: number): number;
}
class RegularDiscount implements DiscountStrategy {
  /*...*/
}

// Good: シンプルな条件分岐
function calculateDiscount(amount, userType) {
  if (userType === "premium") return amount * 0.2;
  if (userType === "regular") return amount * 0.1;
  return 0;
}
```

## 受け入れチェックリスト

| 質問                                        | Noの場合       |
| ------------------------------------------- | -------------- |
| シンプルな関数にできる?                     | そこから始める |
| パターンが実際の問題を解決している?         | 削除する       |
| このコードがなぜ存在するか説明できる?       | リファクタ     |
| ゼロから書くとしたら同じコードを書く?       | リファクタ     |
| 同じことを達成するもっとシンプルなコードは? | オッカム適用   |

## ルール

抽象化するのは以下の場合のみ:

1. 同じパターンが3回以上出現 (DRY)
2. 複数の実装が**実際に**必要
3. 現在のアプローチが**測定可能に**失敗
