# テスト生成（フェーズ3.5 - オプション）

類似のバグを防ぐための追加リグレッションテストを生成。

## 目的

test-generatorを使用してバグと関連エッジケースの包括的なテストカバレッジを作成。

## 使用タイミング

以下の場合に追加テストを生成:

- [Use] バグ修正がテスト可能（ロジックあり）
- [Use] 初期リグレッションテストを超えるエッジケースが存在
- [Use] 関連コードで類似のバグが発生する可能性
- [Use] 統合テストが必要

## スキップするタイミング

以下の場合はテスト生成をスキップ:

- [Skip] ドキュメントのみの変更
- [Skip] 設定ファイルの更新
- [Skip] ロジックのない純粋なUI/CSS変更
- [Skip] 包括的な既存テストがある些細な修正

## テスト生成リファレンス

test-generatorパターンとベストプラクティス:

- [@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - 詳細なパターン
- [@~/.claude/skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - バグ駆動アプローチ

## test-generatorの使用

詳細な呼び出しパターン:
[@~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing](~/.claude/references/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing)

**クイックリファレンス**: パターン2（バグ駆動生成）を以下で使用:

- バグの説明と根本原因
- 修正のサマリー
- フレームワークとスタイルの設定

## 何を生成するか

### 1. メインリグレッションテスト

フェーズ1.5で既に作成済みだが、包括的か確認:

```typescript
it('when discount exceeds total, should return 0 not negative', () => {
  // ✓ フェーズ1.5から既に存在
  expect(calculateTotal(100, 150)).toBe(0)
})
```

### 2. エッジケース

関連エッジケースのテストを生成:

```typescript
// test-generatorで生成:

it('handles zero price with discount', () => {
  expect(calculateTotal(0, 50)).toBe(0)
})

it('handles zero discount', () => {
  expect(calculateTotal(100, 0)).toBe(100)
})

it('handles equal price and discount', () => {
  expect(calculateTotal(100, 100)).toBe(0)
})

it('handles very large discounts', () => {
  expect(calculateTotal(100, 1000000)).toBe(0)
})
```

### 3. 統合テスト（必要な場合）

修正が複数コンポーネントにまたがる場合:

```typescript
it('checkout flow with large discount', () => {
  const cart = createCart([item1, item2]); // price: 100
  cart.applyDiscount(150);
  const total = cart.calculateTotal();
  expect(total).toBe(0); // ✓ 統合が動作
})
```

## 生成されたテストの特徴

生成されたテストに以下を確保:

- [x] **明確な名前**: 何がテストされているかを説明
- [x] **単一フォーカス**: テストごとに1つの動作
- [x] **AAAパターン**: Arrange、Act、Assert
- [x] **エッジカバレッジ**: 境界条件
- [x] **コメント**: 非自明なケースを説明

## 例: 完全な生成

### test-generatorへの入力

```text
バグ: "割引 > 価格の場合に負の合計"
根本原因: "calculateTotalにMath.maxチェックがない"
修正: "非負を保証するためMath.max(0, result)を追加"

エッジケーステストを生成。
```

### 生成された出力

```typescript
describe('calculateTotal - discount edge cases', () => {
  // メインリグレッションテスト（フェーズ1.5から）
  it('returns 0 when discount exceeds price', () => {
    expect(calculateTotal(100, 150)).toBe(0);
  });

  // エッジケース（生成）
  it('handles zero price', () => {
    expect(calculateTotal(0, 50)).toBe(0);
  });

  it('handles zero discount', () => {
    expect(calculateTotal(100, 0)).toBe(100);
  });

  it('handles equal values', () => {
    expect(calculateTotal(100, 100)).toBe(0);
  });

  it('handles boundary conditions', () => {
    expect(calculateTotal(0.01, 0.02)).toBe(0);
    expect(calculateTotal(100, 99.99)).toBeCloseTo(0.01);
  });

  it('maintains precision', () => {
    expect(calculateTotal(10.5, 5.25)).toBe(5.25);
  });
});
```

## 検証

生成後、確認:

- [ ] 生成されたテストがすべて通る
- [ ] テストが意味がある（些細でない）
- [ ] テストが価値を追加（重複でない）
- [ ] テストがプロジェクト規約に従う
- [ ] カバレッジが改善

## ファスト vs 徹底

### ファスト（最小限）

```typescript
// 2-3の重要なエッジケースのみ生成
// 最も可能性の高い失敗モードに集中
```

### 徹底（包括的）

```typescript
// フルエッジケースマトリックスを生成
// 統合テストを含める
// 全境界条件をカバー
```

以下に基づいて選択:

- バグの深刻度（クリティカル → 徹底）
- 利用可能な時間（緊急 → ファスト）
- 信頼度（低 → 徹底）

## 出力フォーマット

```markdown
追加テスト生成

追加テスト: 5
ファイル: src/utils/pricing.test.ts

カバレッジ:
- エッジケース: [✓] ゼロ値、境界条件
- 統合: [✓] チェックアウトフロー
- 負のケース: [✓] 無効な入力

ステータス:
- 全テスト合格: PASS
- カバレッジ改善: 78% → 85%

次: 完了定義
```

## 統合ポイント

- **前**: フェーズ3（検証）
- **次**: 完了（完了定義）
- **リファレンス**: shared/test-generation.md

## リファレンス

- [@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - テストパターン
- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD基礎
