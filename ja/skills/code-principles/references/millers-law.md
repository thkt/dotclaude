# ミラーの法則 - 認知的限界の原則

## 核心哲学

**「魔法の数字7、プラスマイナス2」** - George A. Miller（1956）

人間の心は短期記憶に約**7±2項目**を保持できる。この認知的限界はソフトウェア設計に深い影響を与える。

## 科学的基盤

### 研究

1956年、認知心理学者のGeorge Millerは、人間が約7つの異なるカテゴリを確実に区別し、短期記憶に約7つの項目を保持できることを発見した。これは数字だけの話ではない - 以下に適用される：

- 異なる選択肢
- メニュー項目
- 関数パラメータ
- インターフェース要素
- 概念的なチャンク

### ソフトウェアにおける重要性

この認知的限界を超えると：

- **理解時間が指数関数的に増加**（線形ではない）
- **エラー率が倍増** - 5項目：ベースライン、9項目：2倍のエラー、12項目：4倍のエラー
- **精神的疲労**が加速
- **決定麻痺**が発生

## コードでの実践的適用

### 関数パラメータ

```typescript
// ❌ 認知的過負荷 - 9パラメータ
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ 認知的限界を尊重 - 3つのグループ化されたパラメータ
function createUser(
  identity: UserIdentity,    // name, email
  contact: ContactInfo,      // phone, address
  location: LocationInfo     // city, state, country
) { }
```

### クラスインターフェース

```typescript
// ❌ 覚えるのに多すぎるメソッド
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
  {/* 15オプション - 認知的過負荷 */}
</Select>

// ✅ 階層的グループ化
<Select>
  <OptionGroup label="Common">
    {/* 最もよく使う5つのオプション */}
  </OptionGroup>
  <OptionGroup label="Advanced">
    {/* 高度な5つのオプション */}
  </OptionGroup>
</Select>
```

## 適用ガイドライン

### 推奨限界

| コンテキスト | 理想 | 最大 | 臨界 |
|---------|-------|---------|----------|
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

認知的限界内にあることを確認する方法：

1. **一瞥テスト**：3秒見た後にすべての項目を覚えられるか？
2. **新人開発者テスト**：新人がメモなしで理解できるか？
3. **想起テスト**：記憶からすべてのオプションをリストできるか？

## 他の原則との関連

### 可読性のあるコードをサポート

ミラーの法則は、可読性のあるコードが重要な理由の**科学的根拠**を提供：

```typescript
// 可読性のあるコードは「理解時間を最小化する」と言う
// ミラーの法則は「なぜなら認知能力は7±2に制限されている」と説明
```

### オッカムの剃刀を強化

```typescript
// オッカムの剃刀は「最もシンプルな解決策を選ぶ」と言う
// ミラーの法則は「シンプル = 認知的限界内」を数値化
```

### KISSを検証

```typescript
// KISSは「Keep It Simple, Stupid」と言う
// ミラーの法則は「シンプル = ≤7概念」を定義
```

## 警告サイン

以下の場合、ミラーの法則に違反している：

- 開発者が関数シグネチャのためにドキュメントを常に参照
- コードレビューで頻繁に「パラメータ6は何をするのか？」と質問
- 新チームメンバーがAPIを覚えるのに数週間かかる
- パラメータの目的を説明するために広範なコメントが必要
- IDEの自動補完が不可欠になる（単に便利なだけでなく）

## 実践的リファクタリング

### 前：認知的過負荷

```typescript
function processOrder(
  customerId, productId, quantity, price,
  discount, tax, shipping, expedited,
  giftWrap, giftMessage, couponCode,
  paymentMethod, billingAddress, shippingAddress
) { }
```

### 後：認知的チャンク

```typescript
function processOrder(
  orderItem: OrderItem,       // product, quantity, price
  customer: Customer,         // id, addresses
  pricing: PricingDetails,    // discount, tax, shipping
  options?: OrderOptions      // gift, expedited, coupon
) { }
```

## 覚えておくこと

> 「心は満たされるべき器ではなく、燃やされるべき火である。」 - Plutarch

ルールがそう言っているからではなく、コードを**人間に優しく**するために認知的限界を尊重する。ソフトウェアは一度書かれるが何百回も読まれる - 読み手の認知能力のために最適化する。

## 実践的チェックリスト

コードをコミットする前に確認：

- [ ] 関数パラメータ ≤ 5？
- [ ] クラスのパブリックメソッド ≤ 7？
- [ ] 条件分岐 ≤ 5？
- [ ] 記憶からすべてのオプションを想起できるか？
- [ ] 新人開発者がメモなしで理解できるか？

## 重要なポイント

**7±2は単なる数字ではない - それは明晰さと混乱の境界である。**

## 関連する原則

### 科学的基盤となる

- [@../development/READABLE_CODE.md](../development/READABLE_CODE.md) - 認知科学的根拠を提供
- [@./OCCAMS_RAZOR.md](./OCCAMS_RAZOR.md) - 「シンプル」が何を意味するかを数値化
- [@../development/CONTAINER_PRESENTATIONAL.md](../development/CONTAINER_PRESENTATIONAL.md) - コンポーネントの責任を制限

### 補完される

- [@./SOLID.md](./SOLID.md) - 単一責任は認知的限界と整合
- [@./DRY.md](./DRY.md) - 重複の排除を通じて精神的負荷を軽減
