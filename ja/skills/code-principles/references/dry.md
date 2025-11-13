# DRY原則 - Andy Hunt & Dave Thomasのように

Pragmatic Programmersのように、Don't Repeat Yourself原則を適用する - コードだけでなく、知識の重複を排除する。

## 核心哲学

**「システム内のすべての知識は、単一の、明確な、権威ある表現を持たなければならない」**

それはコードの重複だけではない - 知識の重複についてである。

## 重複の種類

### 1. 文字通りのコード重複

```javascript
// ❌ 悪い例：コピー＆ペースト
function validateEmail(email) { /* validation */ }
function checkEmail(email) { /* same validation */ }

// ✅ 良い例：単一のソース
function validateEmail(email) { /* validation */ }
```

### 2. 構造的重複

```javascript
// ❌ 悪い例：構造の繰り返し
if (user.age > 18 && user.hasConsent) { allow() }
if (post.age > 18 && post.hasConsent) { allow() }

// ✅ 良い例：パターンを抽出
function canAccess(entity) {
  return entity.age > 18 && entity.hasConsent
}
```

### 3. 知識の重複

```javascript
// ❌ 悪い例：複数の場所にビジネスルール
// 検証：maxLength = 100
// データベース：VARCHAR(100)
// UI：maxlength="100"

// ✅ 良い例：単一の真実のソース
const LIMITS = { username: 100 }
// LIMITSをすべての場所で使用
```

## DRYを適用すべき場合

**適用対象**：

- ビジネスルール/ロジック
- データスキーマ
- 設定値
- アルゴリズム
- 複雑な条件

**過剰適用を避けるべき対象**：

- 偶然の類似性
- 異なるコンテキスト
- テストデータ
- シンプルな一行コード

## 3回ルール

重複を2回見たら、注目する。
3回見たら、リファクタリングする。

## 一般的な違反と修正

```javascript
// ❌ マジックナンバー
if (items.length > 10)

// ✅ 名前付き定数
if (items.length > MAX_ITEMS)
```

```javascript
// ❌ 繰り返される条件
if (user && user.isActive && user.hasPermission)

// ✅ カプセル化されたロジック
if (user.canPerform(action))
```

## DRY技法

1. **関数の抽出**：繰り返されるロジックに対して
2. **設定オブジェクト**：繰り返される値に対して
3. **継承/コンポジション**：繰り返される構造に対して
4. **コード生成**：繰り返されるパターンに対して
5. **テンプレート**：類似の実装に対して

## 他の原則との統合

- **SOLIDとの組み合わせ**：DRYが良い抽象化を推進（DIP）
- **TDDとの組み合わせ**：テストが重複を早期に明らかにする
- **Tidyingsとの組み合わせ**：重複を段階的に削除

## 警告サイン

- ショットガン手術（多くの場所で変更）
- 時間とともに分岐する変更
- 「これ書いた気がする」
- グローバル検索置換の必要性

## 覚えておくこと

「DRYは知識の重複、意図の重複についてである。同じことを2箇所以上で、おそらく2つ以上の全く異なる方法で表現することについてである。」 - The Pragmatic Programmer
