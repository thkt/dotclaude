# 機能駆動TDDの例

`/code`コマンドが新機能開発にTDDを使用する方法。

## コンテキスト

- **ソース**: 機能要件を含むspec.md
- **アプローチ**: すべてのテストをスキップ状態で生成し、一つずつ活性化
- **ツール**: test-generatorエージェント

## ワークフロー

```text
1. spec.mdを読む
   └─ FR-xxx要件を抽出
   └─ Given-When-Thenシナリオを識別

2. スキップされたテストを生成
   └─ test-generatorがテストの足場を作成
   └─ すべてのテストをスキップ状態に (it.skip())
   └─ シンプル → 複雑の順序

3. インタラクティブな活性化
   └─ 次のテストを表示
   └─ ユーザーが確認: [Y]es / [S]kip / [Q]uit
   └─ 活性化 → Red → Green → Refactor → Commit
   └─ 各テストで繰り返し

4. すべてのテストが活性化され、パス
```

## 例

```typescript
// spec.mdから生成（すべてスキップ）:

it.skip('handles zero input', () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1)
})

it.skip('calculates basic case', () => {
  // TODO: [SKIP] FR-002
  expect(calculateDiscount(100)).toBe(10)
})

// ユーザーが最初のテストを活性化:
// ステップ1: .skipを削除
// ステップ2: Red - テストが失敗（関数が存在しない）
// ステップ3: Green - 最小限の実装
// ステップ4: Refactor - クリーンアップ
// ステップ5: Commit - 進捗を保存

// 次のテストに繰り返し...
```

## 主な特徴

- **プロアクティブ**: 実装前にテスト
- **仕様駆動**: 要件 → テスト → コード
- **ユーザー制御**: 明示的な活性化
- **Baby Steps**: 一度に1つのテスト

## 詳細なウォークスルー

### Phase 0: テスト生成

**spec.md**（FR-001、FR-002、FR-003）から、test-generatorは以下を作成：

```typescript
describe('Discount Calculator', () => {
  it.skip('handles zero purchase (FR-001)', () => {
    expect(calculateDiscount(0)).toBe(0.1)
  })

  it.skip('calculates standard discount (FR-002)', () => {
    expect(calculateDiscount(50)).toBe(5)
  })

  it.skip('applies bulk discount (FR-003)', () => {
    expect(calculateDiscount(200)).toBe(30)
  })
})
```

すべてのテストがスキップ状態で、シンプル → 複雑の順序（Baby Steps）。

### インタラクティブな活性化サイクル

**サイクル1: 最初のテストを活性化**

```text
🔄 RGRCサイクル 1/3

次のテストを活性化しますか？

📝 テスト: "handles zero purchase (FR-001)"
📁 ファイル: src/discount.test.ts:4
📋 由来: FR-001 (ゼロ購入の処理)

```typescript
it('handles zero purchase (FR-001)', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

[Y] 活性化してRedフェーズに入る
[S] 次のテストにスキップ
[Q] 終了

```text
**ユーザーの選択: Y**

**🔴 Redフェーズ**:

```typescript
// .skipマーカーを削除
it('handles zero purchase (FR-001)', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})

// テストを実行
$ npm test

FAIL  src/discount.test.ts
  ✕ handles zero purchase (FR-001)
    ReferenceError: calculateDiscount is not defined

→ テストが正しい理由で失敗: 関数がまだ存在しない
```

**🟢 Greenフェーズ - 最小限の実装**:

```typescript
// src/discount.ts
export function calculateDiscount(amount: number): number {
  return 0.1  // パスする最もシンプルな解決策
}

// テストを実行
$ npm test

PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)

→ テストがパス！Refactorに移動
```

**🔵 Refactorフェーズ**:

```typescript
// このシンプルなケースでは既にクリーン
// 今回はリファクタリング不要

// テストを実行してグリーンを確認
$ npm test

PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)
```

**✅ Commit**:

```bash
$ git add src/discount.ts src/discount.test.ts
$ git commit -m "feat: handle zero purchase (FR-001)

- Add calculateDiscount function with minimum discount
- Test passes for zero input case"
```

**後続のサイクル**

サイクル2と3も同じパターンに従います：

```text
🔄 RGRCサイクル 2/3
📝 テスト: "calculates standard discount (FR-002)"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit

🔄 RGRCサイクル 3/3
📝 テスト: "applies bulk discount (FR-003)"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit
```

各サイクルで：

1. テストを活性化（.skipを削除）
2. 失敗を確認（Red）
3. 最小実装（Green）
4. 必要に応じてリファクタリング（Refactor）
5. 進捗をコミット（Commit）

**最終状態**:

```typescript
// 最終実装
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1
  const rate = amount > 100 ? 0.15 : 0.1
  return amount * rate
}

// すべてのテストがパス
PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)
  ✓ calculates standard discount (FR-002)
  ✓ applies bulk discount (FR-003)
```

## よくある落とし穴

### ❌ 複数のテストを一度に活性化

```typescript
// やってはいけない:
it('test 1', () => { })  // 活性化
it('test 2', () => { })  // 活性化 <- 一度に複数！
it.skip('test 3', () => { })
```

**なぜ悪いか**: Baby Stepsに違反。テストが失敗した時、どの変更が原因か分からない。

**修正**: 一度に1つのテストを活性化。

### ❌ テスト前に実装を書く

```typescript
// やってはいけない:
// 1. 完全なcalculateDiscount関数を書く
// 2. それからテストを活性化

// やるべきこと:
// 1. 1つのテストを活性化（Red）
// 2. 最小限のコードを書く（Green）
// 3. リファクタリング
// 4. 次のテスト
```

### ❌ Refactorフェーズをスキップ

```typescript
// Greenフェーズの後:
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1
  if (amount > 0 && amount <= 100) return amount * 0.1
  if (amount > 100) return amount * 0.15
  return 0  // デッドコード！
}

// リファクタリングすべき:
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1
  const rate = amount > 100 ? 0.15 : 0.1
  return amount * rate
}
```

## 判断ポイント

### テストをスキップするタイミング？

- テストが現在の理解に対して複雑すぎる
- 依存関係がまだ準備できていない
- アーキテクチャの決定が必要

**注意**: 後で戻ってくる、削除しない。

### コミットするタイミング？

- ✅ すべてのテストがグリーン
- ✅ コードがリファクタリングされ、クリーン
- ✅ 自信 = 1.0

**頻度**: 各テスト活性化サイクル（通常5-10分）。

## メリット

- **仕様駆動**: 要件が直接テストを駆動
- **サプライズなし**: ユーザーがペースをコントロール
- **常にグリーン**: パスするテストでの頻繁なコミット
- **明確な進捗**: ビジュアルなテストキューで残作業を表示

## 使用元

- `/code`コマンド
- Phase 0: テスト準備
