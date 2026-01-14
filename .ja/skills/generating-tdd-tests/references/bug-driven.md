# バグ駆動TDDの例

`/fix`コマンドがバグ修正にTDDをどのように使用するか。

## コンテキスト

- **ソース**: バグの説明と再現手順
- **アプローチ**: バグを再現する失敗テストを書き、リグレッションテストを追加

## ワークフロー

```text
1. バグを再現
   └─ 失敗テストを書く
   └─ テストが失敗することを確認（バグが存在することを確認）

2. バグを修正
   └─ 最小限の実装
   └─ テストが通る

3. リグレッションを防止
   └─ エッジケース用の追加テストを生成
   └─ エッジケースと関連シナリオ
   └─ 必要に応じて統合テスト

4. すべてのテストが通る
```

## 例

```typescript
// ステップ1: 最初に失敗テストを書く
it('割引が合計を超えた場合、負ではなく0を返すべき', () => {
  // これがバグ: 0ではなく-50を返していた
  const result = calculateTotal(100, 150) // 150%割引
  expect(result).toBe(0) // 期待される動作
})

// ステップ2: 失敗を確認
// → テスト実行、-50を返す、アサーション失敗
// → バグが再現可能であることを確認

// ステップ3: コードを修正
function calculateTotal(price, discount) {
  const result = price - discount
  return Math.max(0, result) // ← 修正: 非負を保証
}

// ステップ4: テストが通ることを確認
// → テスト実行、0を返す、アサーション成功

// ステップ5: リグレッションテストを生成
// → リグレッション防止用のエッジケースを追加
it('ゼロ価格を処理', () => { ... })
it('ゼロ割引を処理', () => { ... })
it('負の入力を処理', () => { ... })
```

## 主要な特徴

- **リアクティブ**: バグ → テスト → 修正
- **バグ駆動**: 再現が最初
- **リグレッション重視**: 再発を防止
- **高速イテレーション**: 最小サイクル時間

## 詳細ウォークスルー

### フェーズ1: 根本原因分析

**バグレポート**:

```text
問題: ショッピングカートに負の合計が表示される
再現手順:
1. 商品を追加: 価格$100
2. クーポンを適用: 150%割引
3. 合計を表示: "$0"ではなく"-$50"と表示

期待: 合計は決して負にならないべき
実際: 合計 = -$50
```

**根本原因**:

```typescript
// 現在の（バグのある）コード:
function calculateTotal(price: number, discount: number): number {
  return price - discount; // Bad: 負を返す可能性がある！
}
```

**分析**:

- 検証が欠落: discount > priceのチェックなし
- 期待される動作: 割引が価格を超えたら0を返す
- 修正戦略: Math.max(0, result)を追加

### フェーズ1.5: 失敗テストを書く（Red）

**ステップ1: バグを再現するテストを書く**

```typescript
// src/cart.test.ts
describe("calculateTotal", () => {
  it("割引が価格を超えた場合、負ではなく0を返すべき", () => {
    // これがバグ: 0ではなく-50を返していた
    const result = calculateTotal(100, 150);
    expect(result).toBe(0); // Expected: 0, Received: -50
  });
});
```

**ステップ2: テストを実行して失敗を確認**

```bash
$ npm test -- cart.test.ts

FAIL  src/cart.test.ts
  ✕ 割引が価格を超えた場合、負ではなく0を返すべき (4ms)

    expect(received).toBe(expected)

    Expected: 0
    Received: -50

      at Object.<anonymous> (src/cart.test.ts:5:30)
```

**✅ 確認**: テストは正しい理由で失敗 - バグを正確に再現。

### フェーズ2: バグを修正（Green）

**最小限の修正を適用**:

```typescript
// src/cart.ts
function calculateTotal(price: number, discount: number): number {
  const result = price - discount;
  return Math.max(0, result); // ← 修正: 非負を保証
}
```

**テストを実行**:

```bash
$ npm test -- cart.test.ts

PASS  src/cart.test.ts
  ✓ 割引が価格を超えた場合、負ではなく0を返すべき (2ms)
```

**✅ テスト成功**: バグ修正完了！

### フェーズ3: 検証

**完全なテストスイートを実行**:

```bash
$ npm test

PASS  src/cart.test.ts
  ✓ 割引が価格を超えた場合、負ではなく0を返すべき
PASS  src/cart.existing.test.ts
  ✓ 通常の割引を計算
  ✓ ゼロ割引を処理

Test Suites: 2 passed, 2 total
Tests:       3 passed, 3 total
```

**✅ リグレッションなし**: 既存のすべてのテストがまだ通る。

### フェーズ3.5: リグレッションテストを生成（オプション）

**リグレッション防止用のエッジケースを追加**:

**生成されたテストの例**:

```typescript
describe("calculateTotal - エッジケース", () => {
  it("割引が価格を超えた場合は0を返す", () => {
    expect(calculateTotal(100, 150)).toBe(0);
  });

  it("割引付きのゼロ価格を処理", () => {
    expect(calculateTotal(0, 50)).toBe(0);
  });

  it("価格と割引が等しい場合を処理", () => {
    expect(calculateTotal(100, 100)).toBe(0);
  });

  // ... その他のエッジケース
});
```

## 完全な例の流れ

```typescript
// 修正前: バグが存在
function calculateTotal(price: number, discount: number): number {
  return price - discount; // Bad: 負を返す可能性がある
}

// フェーズ1.5: 失敗テストを書く
it("割引が価格を超えた場合は0を返すべき", () => {
  expect(calculateTotal(100, 150)).toBe(0); // Bad: 失敗
});

// フェーズ2: 最小限の修正を適用
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount); // Good: 修正済み
}

// フェーズ3.5: エッジケースを追加（オプション）
it("ゼロ価格を処理", () => expect(calculateTotal(0, 50)).toBe(0));
it("大きな割引を処理", () => expect(calculateTotal(10, 1000)).toBe(0));
```

## よくある落とし穴

### 悪い例: 修正後にテストを書く

```typescript
// これをしないで:
// 1. まずコードを修正
// 2. その後テストを書く

// こうする:
// 1. 失敗テストを書く（Red）
// 2. コードを修正（Green）
// 3. 必要に応じてリファクタリング
```

**なぜ悪いか**: テストがバグをキャッチすることを証明しない。失敗を見ていない。

### 悪い例: テストがバグを再現しない

```typescript
// 悪いテスト - 実際のバグを再現しない:
it("割引を正しく計算", () => {
  expect(calculateTotal(100, 50)).toBe(50); // これは常に動いていた！
});

// 良いテスト - 正確なバグを再現:
it("割引 > 価格の場合、負ではなく0を返す", () => {
  expect(calculateTotal(100, 150)).toBe(0); // これが失敗していた
});
```

### 悪い例: 修正の過剰エンジニアリング

```typescript
// 過剰エンジニアリング:
class DiscountValidator {
  validate(price: number, discount: number): ValidationResult {}
}

class TotalCalculator {
  constructor(private validator: DiscountValidator) {}
  calculate(price: number, discount: number): number {}
}

// 最小限の修正（オッカムの剃刀）:
function calculateTotal(price: number, discount: number): number {
  return Math.max(0, price - discount);
}
```

### 悪い例: テスト失敗を検証しない

```typescript
// 修正後にテストを実行するだけではダメ:
$ npm test  // Good: PASSES

// 修正前に常にテスト失敗を検証:
$ npm test  // Bad: FAILS（良いこと！）
// ... 修正を適用 ...
$ npm test  // Good: PASSES（修正が動作することを確認）
```

## 判断ポイント

### フェーズ1.5（リグレッションテスト）をスキップする場合

**スキップする場合**:

- ドキュメントのみの変更
- ロジックのない純粋なCSS/スタイリング
- 設定ファイルの更新
- 信頼度 > 0.95 かつ 些細な修正

**常にテストを書く場合**:

- ロジックの変更
- バグ修正
- セキュリティ修正
- データ処理

### 追加テストを生成する場合（フェーズ3.5）

**生成する場合**:

- [Yes] バグが微妙/複雑だった
- [Yes] 複数のエッジケースが存在
- [Yes] 類似のバグの可能性がある
- [Yes] 重要なビジネスロジック

**スキップする場合**:

- [No] 高信頼度の些細な修正
- [No] 包括的なテストが既に存在
- [No] テスト不可能な変更（純粋なUI）

### 「最小限の修正」とは何か

**最小限とは**:

- [Yes] 必要なものだけを変更
- [Yes] 無関係なコードのリファクタリングなし
- [Yes] 修正を超えた「改善」なし
- [Yes] オッカムの剃刀: 最もシンプルな解決策

**例**:

```typescript
// Good: 最小限:
return Math.max(0, price - discount);

// Bad: 最小限でない（不必要な複雑さ）:
if (discount > price) {
  return 0;
} else if (discount === price) {
  return 0;
} else {
  return price - discount;
}
```

## メリット

- **バグ再現**: テストがバグの存在を証明
- **リグレッション防止**: バグが静かに再発しない
- **高速フィードバック**: 修正が動作するかすぐわかる
- **ドキュメント化**: テストが期待される動作を説明
- **信頼性**: 後で安全にリファクタリング可能

## 機能駆動TDDとの比較

| 側面                   | バグ駆動                     | 機能駆動                   |
| ---------------------- | ---------------------------- | -------------------------- |
| **トリガー**           | バグレポート                 | 仕様                       |
| **テスト状態**         | アクティブ（スキップしない） | 最初はスキップ状態         |
| **テスト数**           | 1つのメイン + エッジケース   | すべてのテストを事前に生成 |
| **アクティベーション** | 即時                         | ユーザー制御               |
| **フォーカス**         | リグレッション防止           | 機能完成                   |
| **速度**               | 高速（リアクティブ）         | 系統的（プロアクティブ）   |

## 使用者

- `/fix`コマンド
- フェーズ1.5: リグレッションテストファースト
- フェーズ3.5: テスト生成
