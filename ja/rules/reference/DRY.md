# DRY原則 - Andy Hunt & Dave Thomasのように

プラグマティックプログラマーのようにDon't Repeat Yourself原則を適用 - コードだけでなく、知識の重複を排除する。

## 核心哲学

**「システム内のあらゆる知識の断片は、単一で、曖昧でない、権威ある表現を持つべきである」**

これは単なるコードの重複ではなく、知識の重複に関するものです。

## 重複の種類

### 1. リテラルコードの重複

```javascript
// ❌ 悪い：コピーペースト
function validateEmail(email) { /* 検証 */ }
function checkEmail(email) { /* 同じ検証 */ }

// ✅ 良い：単一のソース
function validateEmail(email) { /* 検証 */ }
```

### 2. 構造的重複

```javascript
// ❌ 悪い：構造の繰り返し
if (user.age > 18 && user.hasConsent) { allow() }
if (post.age > 18 && post.hasConsent) { allow() }

// ✅ 良い：パターンを抽出
function canAccess(entity) {
  return entity.age > 18 && entity.hasConsent
}
```

### 3. 知識の重複

```javascript
// ❌ 悪い：ビジネスルールが複数の場所に
// 検証で：maxLength = 100
// データベースで：VARCHAR(100)
// UIで：maxlength="100"

// ✅ 良い：真実の単一ソース
const LIMITS = { username: 100 }
// どこでもLIMITSを使用
```

## DRYを適用する時

**適用すべき対象**：

- ビジネスルール/ロジック
- データスキーマ
- 設定値
- アルゴリズム
- 複雑な条件

**過度に適用しない対象**：

- 偶然の類似性
- 異なるコンテキスト
- テストデータ
- シンプルなワンライナー

## 3の法則

2回重複を見たら？記録する。
3回見たら？リファクタリングする。

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

## DRYテクニック

1. **関数を抽出**：繰り返されるロジック用
2. **設定オブジェクト**：繰り返される値用
3. **継承/コンポジション**：繰り返される構造用
4. **コード生成**：繰り返しパターン用
5. **テンプレート**：類似の実装用

## 他の原則との統合

- **SOLIDと**：DRYは良い抽象化を促進（DIP）
- **TDDと**：テストが早期に重複を明らかに
- **Tidyingsと**：重複を段階的に削除

## 警告サイン

- ショットガン手術（多くの場所での変更）
- 時間と共に発散する変更
- 「これ、さっき書かなかった？」
- グローバル検索置換の必要性

## 覚えておくこと

「DRYは知識の重複、意図の重複についてです。同じことを2つ以上の場所で、おそらく2つ以上の全く異なる方法で表現することについてです。」- The Pragmatic Programmer
