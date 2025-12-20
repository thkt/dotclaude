# ミラーの法則 - 認知限界の原則

## 核心哲学

**「マジカルナンバー7、プラスマイナス2」** - ジョージ・A・ミラー（1956年）

人間の心は短期記憶に約**7±2個**の項目を保持できる。この認知限界はソフトウェア設計に深い影響を与える。

## 科学的根拠

### 研究

1956年、認知心理学者ジョージ・ミラーは、人間が約7つの異なるカテゴリを確実に区別でき、短期記憶に約7つの項目を保持できることを発見。これは数字だけでなく以下にも適用：

- 異なる選択肢
- メニュー項目
- 関数パラメータ
- インターフェース要素
- 概念的なチャンク

### ソフトウェアで重要な理由

認知限界を超えると：

- **理解時間が指数関数的に増加**（線形ではなく）
- **エラー率が倍増** - 5項目: 基準、9項目: 2倍のエラー、12項目: 4倍のエラー
- **精神的疲労**が加速
- **決定麻痺**が発生

## コードでの実践的適用

### 関数パラメータ

```typescript
// ❌ 認知オーバーロード - 9パラメータ
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ 認知限界を尊重 - 3つのグループ化されたパラメータ
function createUser(
  identity: UserIdentity,    // 名前、メール
  contact: ContactInfo,      // 電話、住所
  location: LocationInfo     // 市、州、国
) { }
```

### クラスインターフェース

```typescript
// ❌ 覚えるメソッドが多すぎる
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

// ✅ 認知チャンクにグループ化
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

### UIデザイン

```typescript
// ❌ 選択肢が多すぎる
<Select>
  {/* 15オプション - 認知オーバーロード */}
</Select>

// ✅ 階層的グループ化
<Select>
  <OptionGroup label="一般">
    {/* 最もよく使う5オプション */}
  </OptionGroup>
  <OptionGroup label="詳細">
    {/* 高度な5オプション */}
  </OptionGroup>
</Select>
```

## 適用ガイドライン

### 推奨制限

| コンテキスト | 理想 | 最大 | 重要 |
|-------------|------|------|------|
| 関数引数 | 3 | 5 | 7 |
| クラスメソッド | 5 | 7 | 9 |
| インターフェースプロパティ | 5 | 7 | 9 |
| メニュー項目 | 5 | 7 | 9 |
| Enum値 | 5 | 9 | 12 |
| 条件分岐 | 3 | 5 | 7 |

### チャンキング戦略

7±2項目を超える必要がある場合、**チャンキング**を使用：

```typescript
// 電話番号のチャンキング
"5551234567"    // ❌ 覚えにくい
"555-123-4567"  // ✅ 3つのチャンク

// コード整理
// ❌ 12のimportのフラットリスト
import { a, b, c, d, e, f, g, h, i, j, k, l } from 'library'

// ✅ グループ化されたimport（グループあたり3-4）
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

1. **一瞥テスト**: 3秒見た後にすべての項目を覚えられるか？
2. **新人テスト**: 新人がメモなしで理解できるか？
3. **想起テスト**: 記憶からすべてのオプションをリストできるか？

## 他の原則との関連

### 可読性のあるコードをサポート

ミラーの法則は可読性のあるコードがなぜ重要かの**科学的根拠**を提供：

```typescript
// 可読性のあるコードは「理解時間を最小化」と言う
// ミラーの法則は「認知能力が7±2に制限されているから」と説明
```

### オッカムの剃刀を強化

```typescript
// オッカムの剃刀は「最もシンプルな解決策を選ぶ」と言う
// ミラーの法則は「シンプル = 認知限界内」と定量化
```

### KISSを検証

```typescript
// KISSは「Keep It Simple, Stupid」と言う
// ミラーの法則は「シンプル = ≤7概念」と定義
```

## 警告サイン

ミラーの法則に違反している時：

- 開発者が常に関数シグネチャのドキュメントを参照
- コードレビューで「パラメータ6は何をする？」と頻繁に質問
- 新しいチームメンバーがAPIを覚えるのに何週間もかかる
- パラメータの目的を説明するために広範なコメントが必要
- IDEの自動補完が必須になる（単に便利なだけでなく）

## 実践的リファクタリング

### Before: 認知オーバーロード

```typescript
function processOrder(
  customerId, productId, quantity, price,
  discount, tax, shipping, expedited,
  giftWrap, giftMessage, couponCode,
  paymentMethod, billingAddress, shippingAddress
) { }
```

### After: 認知チャンク

```typescript
function processOrder(
  orderItem: OrderItem,       // 商品、数量、価格
  customer: Customer,         // ID、住所
  pricing: PricingDetails,    // 割引、税、送料
  options?: OrderOptions      // ギフト、速達、クーポン
) { }
```

## 覚えておくこと

> 「心は満たされる器ではなく、燃え立たせるべき火である」 - プルタルコス

ルールがそう言うからではなく、コードを**人間に優しく**するために認知限界を尊重する。ソフトウェアは一度書かれて何百回も読まれる - 読者の認知能力に最適化する。

## 実践チェックリスト

コードをコミットする前に確認：

- [ ] 関数パラメータ ≤ 5?
- [ ] クラスのpublicメソッド ≤ 7?
- [ ] 条件分岐 ≤ 5?
- [ ] 記憶からすべてのオプションを思い出せるか?
- [ ] 新しい開発者がメモなしで理解できるか?

## 重要な結論

**7±2は単なる数字ではない - それは明確さと混乱の境界である。**

## 関連する原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#参照原則)
