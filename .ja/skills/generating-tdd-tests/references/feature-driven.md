# 機能駆動TDDの例

`/code`コマンドが新機能開発にTDDをどのように使用するか。

## コンテキスト

- **ソース**: 機能要件を含むspec.md
- **アプローチ**: すべてのテストをスキップ状態で生成し、1つずつアクティベート
- **ツール**: test-generatorエージェント

## ワークフロー

```text
1. spec.mdを読む
   └─ FR-xxx要件を抽出
   └─ Given-When-Thenシナリオを特定

2. スキップされたテストを生成
   └─ test-generatorがテストスキャフォールドを作成
   └─ すべてのテストがスキップ状態（it.skip()）
   └─ シンプル → 複雑の順序

3. インタラクティブなアクティベーション
   └─ 次のテストを表示
   └─ ユーザーが確認: [Y]es / [S]kip / [Q]uit
   └─ アクティベート → Red → Green → Refactor → Commit
   └─ 各テストで繰り返す

4. すべてのテストがアクティブでパス
```

## 例

```typescript
// spec.mdから生成（すべてスキップ）:

it.skip('ゼロ入力を処理', () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1)
})

it.skip('基本ケースを計算', () => {
  // TODO: [SKIP] FR-002
  expect(calculateDiscount(100)).toBe(10)
})

// ユーザーが最初のテストをアクティベート:
// ステップ1: .skipを削除
// ステップ2: Red - テスト失敗（関数が存在しない）
// ステップ3: Green - 最小限の実装
// ステップ4: Refactor - クリーンアップ
// ステップ5: Commit - 進捗を保存

// 次のテストで繰り返す...
```

## 主要な特徴

- **プロアクティブ**: 実装前にテスト
- **仕様駆動**: 要件 → テスト → コード
- **ユーザー制御**: 明示的なアクティベーション
- **Baby Steps**: 一度に1つのテスト

## 詳細ウォークスルー

### フェーズ0: テスト生成

**spec.md**（FR-001, FR-002, FR-003）から、test-generatorが作成:

```typescript
describe('Discount Calculator', () => {
  it.skip('ゼロ購入を処理（FR-001）', () => {
    expect(calculateDiscount(0)).toBe(0.1)
  })

  it.skip('標準割引を計算（FR-002）', () => {
    expect(calculateDiscount(50)).toBe(5)
  })

  it.skip('大量割引を適用（FR-003）', () => {
    expect(calculateDiscount(200)).toBe(30)
  })
})
```

すべてのテストがスキップ状態、シンプル → 複雑の順序（Baby Steps）。

### インタラクティブアクティベーションサイクル

**サイクル1: 最初のテストをアクティベート**

```text
🔄 RGRCサイクル 1/3

次のテストをアクティベートしますか？

📝 テスト: "ゼロ購入を処理（FR-001）"
📁 ファイル: src/discount.test.ts:4
📋 出典: FR-001（ゼロ購入処理）

```typescript
it('ゼロ購入を処理（FR-001）', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

[Y] アクティベートしてRedフェーズに入る
[S] 次のテストにスキップ
[Q] 終了

```text
**ユーザーが選択: Y**

**🔴 Redフェーズ**:

```typescript
// .skipマーカーを削除
it('ゼロ購入を処理（FR-001）', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})

// テスト実行
$ npm test

FAIL  src/discount.test.ts
  ✕ ゼロ購入を処理（FR-001）
    ReferenceError: calculateDiscount is not defined

→ テストは正しい理由で失敗: 関数がまだ存在しない
```

**🟢 Greenフェーズ - 最小限の実装**:

```typescript
// src/discount.ts
export function calculateDiscount(amount: number): number {
  return 0.1  // パスする最もシンプルな解決策
}

// テスト実行
$ npm test

PASS  src/discount.test.ts
  ✓ ゼロ購入を処理（FR-001）

→ テスト成功！Refactorに移動
```

**🔵 Refactorフェーズ**:

```typescript
// このシンプルなケースでは既にコードはクリーン
// まだリファクタリング不要

// テストを実行してグリーンを確認
$ npm test

PASS  src/discount.test.ts
  ✓ ゼロ購入を処理（FR-001）
```

**✅ Commit**:

```bash
$ git add src/discount.ts src/discount.test.ts
$ git commit -m "feat: ゼロ購入を処理（FR-001）

- 最小割引でcalculateDiscount関数を追加
- ゼロ入力ケースのテストがパス"
```

**後続サイクル**

サイクル2と3は同じパターンに従う:

```text
🔄 RGRCサイクル 2/3
📝 テスト: "標準割引を計算（FR-002）"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit

🔄 RGRCサイクル 3/3
📝 テスト: "大量割引を適用（FR-003）"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit
```

各サイクル:

1. テストをアクティベート（.skipを削除）
2. 失敗を検証（Red）
3. 最小限の実装（Green）
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
  ✓ ゼロ購入を処理（FR-001）
  ✓ 標準割引を計算（FR-002）
  ✓ 大量割引を適用（FR-003）
```

## よくある落とし穴

### 悪い例: 複数のテストを同時にアクティベート

```typescript
// これをしないで:
it('test 1', () => { })  // アクティベート済み
it('test 2', () => { })  // アクティベート済み <- 複数を同時に！
it.skip('test 3', () => { })
```

**なぜ悪いか**: Baby Stepsに違反。テストが失敗した場合、どの変更が原因かわからない。

**修正**: 一度に1つのテストをアクティベート。

### 悪い例: テスト前に実装を書く

```typescript
// これをしないで:
// 1. 完全なcalculateDiscount関数を書く
// 2. その後テストをアクティベート

// こうする:
// 1. 1つのテストをアクティベート（Red）
// 2. 最小限のコードを書く（Green）
// 3. リファクタリング
// 4. 次のテスト
```

### 悪い例: Refactorフェーズをスキップ

```typescript
// Greenフェーズ後:
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

### テストをスキップする場合

- 現在の理解では複雑すぎるテスト
- 依存関係がまだ準備できていない
- アーキテクチャ決定が必要

**注意**: 後で戻る、削除しない。

### コミットする場合

- ✅ すべてのテストがグリーン
- ✅ コードがリファクタリングされてクリーン
- ✅ 信頼度 = 1.0

**頻度**: 各テストアクティベーションサイクル（通常5-10分）。

## メリット

- **仕様駆動**: 要件が直接テストを駆動
- **サプライズなし**: ユーザーがペースを制御
- **常にグリーン**: テストがパスした状態で頻繁にコミット
- **明確な進捗**: ビジュアルテストキューが残りの作業を表示

## 使用者

- `/code`コマンド
- フェーズ0: テスト準備
