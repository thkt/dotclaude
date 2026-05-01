# AI コードのアンチパターン

## 警告サイン

| パターン                     | 例                                         | 修正                      |
| ---------------------------- | ------------------------------------------ | ------------------------- |
| interface, 実装 1 つ         | `interface X { } class DefaultX impl X`    | 関数を直接使う            |
| 関数 1 つを class でラップ   | `class CSVReader { read() {} }`            | シンプルな関数            |
| 1 箇所でしか使わない helper  | `getUserName(u)` を 1 箇所で利用           | インライン化: `user.name` |
| 単純なタスクのプラグイン機構 | `ValidationEngine.registerValidator()`     | 直接バリデーション関数    |
| 単純な生成のための factory   | `UserFactory.createUser()`                 | `createUser()` 関数       |
| 静的ロジックの strategy      | `interface DiscountStrategy { calculate }` | シンプルな条件分岐        |

## 各アプローチの使い分け

| アプローチ | 場面                                         |
| ---------- | -------------------------------------------- |
| 関数       | 単一の操作、状態なし、単純なタスク           |
| class      | 複数の関連操作、共有状態、明確な境界         |
| interface  | 2 つ以上の実装が実在する                     |
| パターン   | 実問題を解決する、ランタイムで挙動切替が必要 |

## 複雑さのマッチング

| タスクスコープ   | アプローチ                                  |
| ---------------- | ------------------------------------------- |
| 単一関数         | 直接的な手続き型                            |
| ファイルレベル   | 最小限の抽象化を持つ関数                    |
| モジュールレベル | 共有状態が必要なときに class                |
| システムレベル   | 複数チーム / プラグインがあるときにパターン |

## コード例

```typescript
// 悪い: 不要な factory
class UserFactory {
  createUser(name, email) {
    return { name, email, createdAt: new Date() };
  }
}

// 良い: シンプルな関数
function createUser(name, email) {
  return { name, email, createdAt: new Date() };
}
```

```typescript
// 悪い: 静的ロジックに strategy パターン
interface DiscountStrategy {
  calculate(amount: number): number;
}
class RegularDiscount implements DiscountStrategy {
  /*...*/
}

// 良い: シンプルな条件分岐
function calculateDiscount(amount, userType) {
  if (userType === "premium") return amount * 0.2;
  if (userType === "regular") return amount * 0.1;
  return 0;
}
```

## 受け入れチェックリスト

| 質問                                 | No なら        |
| ------------------------------------ | -------------- |
| シンプルな関数で済むか               | そこから始める |
| パターンが実問題を解決しているか     | 削除           |
| なぜこれが存在するか説明できるか     | リファクタ     |
| ゼロから書くなら同じ書き方をするか   | リファクタ     |
| 同じ結果をシンプルなコードで出せるか | Occam's を適用 |

## ルール

抽象化は次の場合のみ:

1. 同じパターンが 3 回以上出現 (DRY)
2. 複数の実装が実際に必要
3. 現状アプローチが計測可能な形で破綻している
