# テスト生成（Phase 3.5 - オプション）

類似のバグを防ぐための追加回帰テストを生成。

## 目的

test-generatorを使用して、バグと関連するエッジケースの包括的なテストカバレッジを作成。

## 使用するタイミング

以下の場合に追加テストを生成:

- ✅ バグ修正がテスト可能（ロジックがある）
- ✅ 初期の回帰テスト以外にエッジケースが存在
- ✅ 関連コードに類似のバグの可能性
- ✅ 統合テストが必要

## スキップするタイミング

以下の場合はテスト生成をスキップ:

- ❌ ドキュメントのみの変更
- ❌ 設定ファイルの更新
- ❌ ロジックのない純粋なUI/CSS変更
- ❌ 包括的な既存テストがある些細な修正

## テスト生成リファレンス

test-generatorのパターンとベストプラクティス:

- [@~/.claude/commands/shared/test-generation.md](~/.claude/commands/shared/test-generation.md) - 詳細なパターン
- [@~/.claude/skills/tdd-fundamentals/examples/bug-driven.md](~/.claude/skills/tdd-fundamentals/examples/bug-driven.md) - バグ駆動アプローチ

## test-generatorの使用

詳細な呼び出しパターン:
[@~/.claude/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing](~/.claude/commands/shared/test-generation.md#pattern-2-bug-driven-generation-bug-fixing)

**クイックリファレンス**: Pattern 2（バグ駆動生成）を以下と共に使用:

- バグの説明と根本原因
- 修正のサマリー
- フレームワークとスタイルの設定

## 生成するもの

### 1. メイン回帰テスト

Phase 1.5 で既に作成済み、包括的かどうかを確認:

```typescript
it('割引が合計を超える場合、負の値ではなく0を返すべき', () => {
  // ✓ Phase 1.5 から既に存在
  expect(calculateTotal(100, 150)).toBe(0)
})
```

### 2. エッジケース

関連するエッジケース用のテストを生成:

```typescript
// test-generator経由で生成:

it('ゼロ価格と割引を処理', () => {
  expect(calculateTotal(0, 50)).toBe(0)
})

it('ゼロ割引を処理', () => {
  expect(calculateTotal(100, 0)).toBe(100)
})

it('同額の価格と割引を処理', () => {
  expect(calculateTotal(100, 100)).toBe(0)
})

it('非常に大きな割引を処理', () => {
  expect(calculateTotal(100, 1000000)).toBe(0)
})
```

### 3. 統合テスト（必要な場合）

修正が複数コンポーネントにまたがる場合:

```typescript
it('大きな割引でのチェックアウトフロー', () => {
  const cart = createCart([item1, item2]); // 価格: 100
  cart.applyDiscount(150);
  const total = cart.calculateTotal();
  expect(total).toBe(0); // ✓ 統合が動作
})
```

## 生成されたテストの特性

生成されたテストが持つべきもの:

- ✅ **明確な名前**: 何がテストされているかを説明
- ✅ **単一フォーカス**: テストごとに1つの動作
- ✅ **AAAパターン**: Arrange、Act、Assert
- ✅ **エッジカバレッジ**: 境界条件
- ✅ **コメント**: 非自明なケースを説明

## 例: 完全な生成

### test-generatorへの入力

```text
バグ: "割引が価格より大きい場合に負の合計"
根本原因: "calculateTotalにMath.maxチェックがない"
修正: "非負を保証するためにMath.max(0, result)を追加"

エッジケーステストを生成。
```

### 生成された出力

```typescript
describe('calculateTotal - 割引エッジケース', () => {
  // メイン回帰テスト（Phase 1.5から）
  it('割引が価格を超える場合0を返す', () => {
    expect(calculateTotal(100, 150)).toBe(0);
  });

  // エッジケース（生成）
  it('ゼロ価格を処理', () => {
    expect(calculateTotal(0, 50)).toBe(0);
  });

  it('ゼロ割引を処理', () => {
    expect(calculateTotal(100, 0)).toBe(100);
  });

  it('同じ値を処理', () => {
    expect(calculateTotal(100, 100)).toBe(0);
  });

  it('境界条件を処理', () => {
    expect(calculateTotal(0.01, 0.02)).toBe(0);
    expect(calculateTotal(100, 99.99)).toBeCloseTo(0.01);
  });

  it('精度を維持', () => {
    expect(calculateTotal(10.5, 5.25)).toBe(5.25);
  });
});
```

## 検証

生成後に確認:

- [ ] すべての生成されたテストが合格
- [ ] テストが意味がある（些細でない）
- [ ] テストが価値を追加（重複でない）
- [ ] テストがプロジェクトの規約に従う
- [ ] カバレッジが向上

## Fast vs Thorough

### Fast（最小限）

```typescript
// 2-3の重要なエッジケースのみを生成
// 最も可能性の高い失敗モードに焦点
```

### Thorough（包括的）

```typescript
// 完全なエッジケースマトリックスを生成
// 統合テストを含む
// すべての境界条件をカバー
```

以下に基づいて選択:

- バグの重大度（重大 → thorough）
- 利用可能な時間（緊急 → fast）
- 信頼度（低 → thorough）

## 出力フォーマット

```markdown
✅ 追加テスト生成完了

📝 追加テスト: 5
📁 ファイル: src/utils/pricing.test.ts

カバレッジ:
- エッジケース: [✓] ゼロ値、境界条件
- 統合: [✓] チェックアウトフロー
- ネガティブケース: [✓] 無効な入力

ステータス:
- すべてのテスト合格: ✅
- カバレッジ向上: 78% → 85%

次: 完了定義
```

## 統合ポイント

- **前**: Phase 3（検証）
- **次**: 完了（完了定義）
- **参照**: shared/test-generation.md

## 参照

- [@~/.claude/commands/shared/test-generation.md](~/.claude/commands/shared/test-generation.md) - テストパターン
- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDDの基礎
