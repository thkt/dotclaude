# DRY原則 - Andy Hunt & Dave Thomasのように

達人プログラマーのようにDRY原則を適用 - コードだけでなく知識の重複を排除。

## 核心哲学

**「すべての知識は、システム内で単一の、明確な、権威ある表現を持たなければならない」**

これはコードの重複だけでなく、知識の重複に関するもの。

## 重複の種類

### 1. 文字通りのコード重複

```javascript
// ❌ 悪い: コピー＆ペースト
function validateEmail(email) { /* validation */ }
function checkEmail(email) { /* same validation */ }

// ✅ 良い: 単一ソース
function validateEmail(email) { /* validation */ }
```

### 2. 構造的重複

```javascript
// ❌ 悪い: 繰り返しの構造
if (user.age > 18 && user.hasConsent) { allow() }
if (post.age > 18 && post.hasConsent) { allow() }

// ✅ 良い: パターンを抽出
function canAccess(entity) {
  return entity.age > 18 && entity.hasConsent
}
```

### 3. 知識の重複

```javascript
// ❌ 悪い: 複数の場所にビジネスルール
// バリデーションで: maxLength = 100
// データベースで: VARCHAR(100)
// UIで: maxlength="100"

// ✅ 良い: 単一の信頼できるソース
const LIMITS = { username: 100 }
// どこでもLIMITSを使用
```

## DRYを適用するタイミング

**適用対象**:

- ビジネスルール/ロジック
- データスキーマ
- 設定値
- アルゴリズム
- 複雑な条件

**過剰適用しない**:

- 偶然の類似性
- 異なるコンテキスト
- テストデータ
- シンプルな1行コード

## 3の法則

重複を2回見た？ メモする。
3回見た？ リファクタリングする。

## 一般的な違反と修正

```javascript
// ❌ マジックナンバー
if (items.length > 10)

// ✅ 名前付き定数
if (items.length > MAX_ITEMS)
```

```javascript
// ❌ 繰り返しの条件
if (user && user.isActive && user.hasPermission)

// ✅ カプセル化されたロジック
if (user.canPerform(action))
```

## DRY技法

1. **関数の抽出**: 繰り返しロジックに
2. **設定オブジェクト**: 繰り返し値に
3. **継承/コンポジション**: 繰り返し構造に
4. **コード生成**: 反復パターンに
5. **テンプレート**: 類似実装に

## 他の原則との統合

- **SOLIDと**: DRYは良い抽象化を促進（DIP）
- **TDDと**: テストが早期に重複を明らかにする
- **Tidyingsと**: 段階的に重複を削除

## 警告サイン

- 散弾銃手術（多くの場所で変更）
- 時間とともに乖離する変更
- 「これ、さっき書いたような...」
- グローバル検索置換が必要

## 覚えておくこと

「DRYは知識の重複、意図の重複に関するもの。それは同じことを2つ以上の場所で、おそらく2つ以上のまったく異なる方法で表現することについて」 - 達人プログラマー

## 関連する原則

### 基本原則（同レベル）

- [@~/.claude/ja/rules/reference/SOLID.md](~/.claude/ja/rules/reference/SOLID.md) - DRYは良い抽象化を促進（DIP）
- [@~/.claude/ja/rules/reference/OCCAMS_RAZOR.md](~/.claude/ja/rules/reference/OCCAMS_RAZOR.md) - 単一ソースによるシンプルさ

### 実践での適用

- [@~/.claude/ja/rules/development/TDD_RGRC.md](~/.claude/ja/rules/development/TDD_RGRC.md) - テストが早期に重複を明らかにする
- [@~/.claude/ja/rules/development/TIDYINGS.md](~/.claude/ja/rules/development/TIDYINGS.md) - 段階的に重複を削除
