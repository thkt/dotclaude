# バグ駆動TDDの例

`/fix`コマンドがバグ修正にTDDを使用する方法。

## コンテキスト

- **ソース**: バグの説明と再現手順
- **アプローチ**: バグを再現する失敗するテストを書く
- **ツール**: 最初は手動テスト、その後リグレッションのためにtest-generator

## ワークフロー

```text
1. バグを再現
   └─ 失敗するテストを書く
   └─ テストが失敗することを確認（バグが存在することを確認）

2. バグを修正
   └─ 最小限の実装
   └─ テストがパス

3. リグレッションを防止
   └─ test-generatorが追加のテストを作成
   └─ エッジケースと関連シナリオ
   └─ 必要に応じて統合テスト

4. すべてのテストがパス
```

## 例

```typescript
// ステップ1: 失敗するテストを最初に書く
it('when discount exceeds total, should return 0 not negative', () => {
  // これがバグ: -50を返していたが0を返すべき
  const result = calculateTotal(100, 150) // 150%の割引
  expect(result).toBe(0) // 期待される動作
})

// ステップ2: 失敗することを確認
// → テストを実行、-50を返す、アサーション失敗
// → バグが再現可能であることを確認

// ステップ3: コードを修正
function calculateTotal(price, discount) {
  const result = price - discount
  return Math.max(0, result) // ← 修正: 非負を保証
}

// ステップ4: テストがパスすることを確認
// → テストを実行、0を返す、アサーションがパス

// ステップ5: リグレッションテストを生成
// → test-generatorがエッジケースを追加
it('handles zero price', () => { ... })
it('handles zero discount', () => { ... })
it('handles negative inputs', () => { ... })
```

## 主な特徴

- **リアクティブ**: バグ → テスト → 修正
- **バグ駆動**: 最初に再現
- **リグレッション重視**: 再発を防止
- **高速イテレーション**: 最小限のサイクル時間

## 詳細なウォークスルー

### Phase 1: 根本原因分析

**バグレポート**:

```text
問題: ショッピングカートが負の合計を表示
再現手順:
1. アイテムを追加: 価格 $100
2. クーポンを適用: 150%割引
3. 合計を表示: "$0"ではなく"-$50"を表示

期待: 合計は決して負にならない
実際: 合計 = -$50
```

**根本原因**:

```typescript
// 現在の（バグのある）コード:
function calculateTotal(price: number, discount: number): number {
  return price - discount  // ❌ 負を返す可能性！
}
```

**分析**:

- バリデーション欠落: discount > priceのチェックなし
- 期待される動作: 割引が価格を超える場合は0を返す
- 修正戦略: Math.max(0, result)を追加

### Phase 1.5: 失敗するテストを書く（Red）

**ステップ1: バグを再現するテストを書く**

```typescript
// src/cart.test.ts
describe('calculateTotal', () => {
  it('when discount exceeds price, should return 0 not negative', () => {
    // これがバグ: -50を返していたが0を返すべき
    const result = calculateTotal(100, 150)
    expect(result).toBe(0) // 期待: 0、実際: -50
  })
})
```

**ステップ2: テストを実行して失敗を確認**

```bash
$ npm test -- cart.test.ts

FAIL  src/cart.test.ts
  ✕ when discount exceeds price, should return 0 not negative (4ms)

    expect(received).toBe(expected)

    Expected: 0
    Received: -50

      at Object.<anonymous> (src/cart.test.ts:5:30)
```

**✅ 確認済み**: テストが正しい理由で失敗 - バグを正確に再現。

### Phase 2: バグを修正（Green）

**最小限の修正を適用**:

```typescript
// src/cart.ts
function calculateTotal(price: number, discount: number): number {
  const result = price - discount
  return Math.max(0, result)  // ← 修正: 非負を保証
}
```

**テストを実行**:

```bash
$ npm test -- cart.test.ts

PASS  src/cart.test.ts
  ✓ when discount exceeds price, should return 0 not negative (2ms)
```

**✅ テストがパス**: バグが修正された！

### Phase 3: 検証

**完全なテストスイートを実行**:

```bash
$ npm test

PASS  src/cart.test.ts
  ✓ when discount exceeds price, should return 0 not negative
PASS  src/cart.existing.test.ts
  ✓ calculates normal discount
  ✓ handles zero discount

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

**✅ リグレッションなし**: すべての既存のテストが引き続きパス。

### Phase 3.5: リグレッションテストを生成（オプション）

**追加のエッジケースにtest-generatorを使用**:

詳細な使用方法: [@~/.claude/commands/shared/test-generation.md#pattern-2-bug-driven-generation](~/.claude/commands/shared/test-generation.md#pattern-2-bug-driven-generation)

**生成例**:

```typescript
describe('calculateTotal - edge cases', () => {
  it('returns 0 when discount exceeds price', () => {
    expect(calculateTotal(100, 150)).toBe(0)
  })

  it('handles zero price with discount', () => {
    expect(calculateTotal(0, 50)).toBe(0)
  })

  it('handles equal price and discount', () => {
    expect(calculateTotal(100, 100)).toBe(0)
  })

  // ... その他のエッジケース
})
```

## 完全な例のフロー

```typescript
// 修正前: バグが存在
function calculateTotal(price: number, discount: number): number {
  return price - discount  // ❌ 負を返す可能性
}

// Phase 1.5: 失敗するテストを書く
it('should return 0 when discount exceeds price', () => {
  expect(calculateTotal(100, 150)).toBe(0)  // ❌ 失敗
})

// Phase 2: 最小限の修正を適用
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount)  // ✅ 修正済み
}

// Phase 3.5: エッジケースを追加（オプション）
it('handles zero price', () => expect(calculateTotal(0, 50)).toBe(0))
it('handles large discounts', () => expect(calculateTotal(10, 1000)).toBe(0))
```

## よくある落とし穴

### ❌ 修正後にテストを書く

```typescript
// やってはいけない:
// 1. コードを最初に修正
// 2. それからテストを書く

// やるべきこと:
// 1. 失敗するテストを書く（Red）
// 2. コードを修正（Green）
// 3. 必要に応じてリファクタリング
```

**なぜ悪いか**: テストがバグをキャッチすることを証明しない。失敗するのを見なかった。

### ❌ テストがバグを再現しない

```typescript
// 悪いテスト - 実際のバグを再現しない:
it('calculates discount correctly', () => {
  expect(calculateTotal(100, 50)).toBe(50)  // これは常に動作していた！
})

// 良いテスト - 正確なバグを再現:
it('when discount > price, returns 0 not negative', () => {
  expect(calculateTotal(100, 150)).toBe(0)  // これが失敗していた
})
```

### ❌ 修正の過剰設計

```typescript
// 過剰設計:
class DiscountValidator {
  validate(price: number, discount: number): ValidationResult { }
}

class TotalCalculator {
  constructor(private validator: DiscountValidator) { }
  calculate(price: number, discount: number): number { }
}

// 最小限の修正（オッカムの剃刀）:
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount)
}
```

### ❌ テストの失敗を確認しない

```typescript
// 修正後にテストを実行するだけではダメ:
$ npm test  // ✅ パス

// 常に修正前にテストが失敗することを確認:
$ npm test  // ❌ 失敗（良い！）
// ... 修正を適用 ...
$ npm test  // ✅ パス（修正が機能することを確認）
```

## 判断ポイント

### Phase 1.5（リグレッションテスト）をスキップするタイミング？

**スキップする場合**:

- ドキュメントのみの変更
- ロジックなしの純粋なCSS/スタイリング
- 設定ファイルの更新
- 自信 > 0.95 かつ 些細な修正

**常にテストを書く場合**:

- ロジック変更
- バグ修正
- セキュリティ修正
- データ処理

### 追加のテストを生成するタイミング（Phase 3.5）？

**生成する場合**:

- ✅ バグが微妙/複雑だった
- ✅ 複数のエッジケースが存在
- ✅ 類似のバグの可能性
- ✅ 重要なビジネスロジック

**スキップする場合**:

- ❌ 高い自信を持つ些細な修正
- ❌ 包括的なテストが既に存在
- ❌ テスト不可能な変更（純粋なUI）

### 「最小限の修正」とはどの程度？

**最小限の意味**:

- ✅ 必要なことだけを変更
- ✅ 無関係なコードのリファクタリングなし
- ✅ 修正を超える「改善」なし
- ✅ オッカムの剃刀: 最もシンプルな解決策

**例**:

```typescript
// ✅ 最小限:
return Math.max(0, price - discount)

// ❌ 最小限ではない（不必要な複雑さ）:
if (discount > price) {
  return 0
} else if (discount === price) {
  return 0
} else {
  return price - discount
}
```

## メリット

- **バグの再現**: テストがバグが存在することを証明
- **リグレッション防止**: バグが静かに再発できない
- **高速フィードバック**: 修正が機能するかすぐに分かる
- **ドキュメント**: テストが期待される動作を説明
- **自信**: 後で安全にリファクタリングできる

## 機能駆動TDDとの比較

| 側面 | バグ駆動 | 機能駆動 |
|------|----------|----------|
| **トリガー** | バグレポート | 仕様 |
| **テスト状態** | アクティブ（スキップなし） | 最初はスキップ状態 |
| **テスト数** | 1つのメイン + エッジケース | すべてのテストを事前生成 |
| **活性化** | 即座 | ユーザー制御 |
| **焦点** | リグレッション防止 | 機能完成 |
| **速度** | 高速（リアクティブ） | 体系的（プロアクティブ） |

## 使用元

- `/fix`コマンド
- Phase 1.5: リグレッションテスト優先
- Phase 3.5: テスト生成
