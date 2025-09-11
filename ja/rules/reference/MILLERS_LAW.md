# Millerの法則 - 認知限界の原則

## 核心哲学

**「マジカルナンバー7±2」** - ジョージ・A・ミラー（1956年）

人間の短期記憶は約**7±2個**のアイテムを保持できます。この認知限界はソフトウェア設計に深い影響を与えます。

## 科学的基盤

### 研究内容

1956年、認知心理学者ジョージ・ミラーは、人間が約7つの異なるカテゴリーを確実に識別でき、短期記憶に約7つのアイテムを保持できることを発見しました。これは単なる数字ではなく、以下に適用されます：

- 異なる選択肢
- メニュー項目
- 関数パラメータ
- インターフェース要素
- 概念的なチャンク

### ソフトウェアにおける重要性

この認知限界を超えると：

- **理解時間が指数関数的に増加**（線形ではない）
- **エラー率が倍増** - 5項目：基準値、9項目：2倍のエラー、12項目：4倍のエラー
- **精神的疲労**が加速
- **決定麻痺**が発生

## コードへの実践的適用

### 関数パラメータ

```typescript
// ❌ 認知過負荷 - 9個のパラメータ
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ 認知限界を尊重 - 3個のグループ化されたパラメータ
function createUser(
  identity: UserIdentity,    // 名前、メール
  contact: ContactInfo,      // 電話、住所
  location: LocationInfo     // 市、州、国
) { }
```

### クラスインターフェース

```typescript
// ❌ 覚えきれないほど多いメソッド
class DataProcessor {
  validate() { }
  sanitize() { }
  normalize() { }
  transform() { }
  aggregate() { }
  filter() { }
  sort() { }
  paginate() { }
  cache() { }
  serialize() { }
  compress() { }
  encrypt() { }
}

// ✅ 認知的チャンクにグループ化
class DataProcessor {
  // 入力処理（3メソッド）
  prepare() { }     // validate + sanitize + normalize

  // データ操作（3メソッド）
  transform() { }
  filter() { }
  aggregate() { }

  // 出力処理（2メソッド）
  format() { }      // serialize + compress
  secure() { }      // encrypt
}
```

### UI設計

```typescript
// ❌ 選択肢が多すぎる
<Select>
  {/* 15個の選択肢 - 認知過負荷 */}
</Select>

// ✅ 階層的グループ化
<Select>
  <OptionGroup label="よく使う">
    {/* 最もよく使う5個の選択肢 */}
  </OptionGroup>
  <OptionGroup label="詳細">
    {/* 高度な5個の選択肢 */}
  </OptionGroup>
</Select>
```

## 適用ガイドライン

### 推奨制限

| コンテキスト | 理想 | 最大 | 限界 |
|------------|------|------|------|
| 関数引数 | 3 | 5 | 7 |
| クラスメソッド | 5 | 7 | 9 |
| インターフェースプロパティ | 5 | 7 | 9 |
| メニュー項目 | 5 | 7 | 9 |
| Enum値 | 5 | 9 | 12 |
| 条件分岐 | 3 | 5 | 7 |

### チャンキング戦略

7±2個を超える必要がある場合は、**チャンキング**を使用：

```typescript
// 電話番号のチャンキング
"5551234567"    // ❌ 覚えにくい
"555-123-4567"  // ✅ 3つのチャンク

// コードの整理
// ❌ 12個のインポートのフラットリスト
import { a, b, c, d, e, f, g, h, i, j, k, l } from 'library'

// ✅ グループ化されたインポート（グループあたり3-4個）
import {
  // UIコンポーネント
  Button, Input, Select,
  // レイアウトコンポーネント
  Grid, Flex, Stack,
  // ユーティリティコンポーネント
  Modal, Toast, Tooltip
} from 'library'
```

### 測定技法

認知限界内にあることを確認する方法：

1. **一瞥テスト**：3秒見た後、すべての項目を思い出せるか？
2. **新人開発者テスト**：新人がメモなしで理解できるか？
3. **想起テスト**：記憶からすべての選択肢をリストできるか？

## 他の原則との関連

### Readable Codeをサポート

Millerの法則は、なぜ可読性のあるコードが重要かの**科学的根拠**を提供：

```typescript
// Readable Codeは「理解時間を最小化」と言う
// Millerの法則は「認知容量が7±2に限られているから」と説明
```

### オッカムの剃刀を強化

```typescript
// オッカムの剃刀は「最もシンプルな解決策を選ぶ」と言う
// Millerの法則は「シンプル = 認知限界内」と定量化
```

### KISSを検証

```typescript
// KISSは「Keep It Simple, Stupid」と言う
// Millerの法則は「シンプル = 7個以下の概念」と定義
```

## 警告サイン

Millerの法則に違反している時：

- 開発者が関数シグネチャのためにドキュメントを常に参照する
- コードレビューで「パラメータ6は何？」と頻繁に質問される
- 新しいチームメンバーがAPIを覚えるのに数週間かかる
- パラメータの目的を説明するために広範なコメントが必要
- IDEのオートコンプリートが必須になる（単に便利ではなく）

## 実践的リファクタリング

### Before: 認知過負荷

```typescript
function processOrder(
  customerId, productId, quantity, price,
  discount, tax, shipping, expedited,
  giftWrap, giftMessage, couponCode,
  paymentMethod, billingAddress, shippingAddress
) { }
```

### After: 認知的チャンク

```typescript
function processOrder(
  orderItem: OrderItem,       // 商品、数量、価格
  customer: Customer,         // ID、住所
  pricing: PricingDetails,    // 割引、税、送料
  options?: OrderOptions      // ギフト、速達、クーポン
) { }
```

## 覚えておくべきこと

> 「心は満たされる器ではなく、点火される炎である」 - プルタルコス

認知限界を尊重するのは、ルールがそう言うからではなく、コードを**人間に優しく**するためです。ソフトウェアは一度書かれますが、何百回も読まれます - 読者の認知容量のために最適化しましょう。

## 実践的チェックリスト

コミット前に確認：

- [ ] 関数パラメータ ≤ 5個？
- [ ] クラスの公開メソッド ≤ 7個？
- [ ] 条件分岐 ≤ 5個？
- [ ] すべての選択肢を記憶から思い出せる？
- [ ] 新しい開発者がメモなしで理解できる？

## 重要なポイント

**7±2は単なる数字ではない - 明確さと混乱の境界線である。**

## 関連する原則

### 科学的基盤を提供

- [@../development/READABLE_CODE.md] - 認知科学の基盤を提供
- [@./OCCAMS_RAZOR.md] - 「シンプル」の意味を定量化
- [@../development/CONTAINER_PRESENTATIONAL.md] - コンポーネントの責任を制限

### 補完関係

- [@./SOLID.md] - 単一責任が認知限界と整合
- [@./DRY.md] - 重複排除により精神的負荷を軽減
