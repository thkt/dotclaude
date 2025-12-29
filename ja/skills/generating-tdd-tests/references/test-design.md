---
summary: |
  同値分割、境界値分析、デシジョンテーブルを使用した体系的なテスト設計。
  高品質なテスト生成のためのフレームワーク非依存の原則。
  量より質 - 実際のバグを効率的に捉えるテストを設計。
decision_question: "テストケースはすべての意味のあるシナリオを効率的にカバーしているか？"
---

# テスト生成 - 体系的なテスト設計

**核心原則**：実証済みの技法を使用してテストを体系的に設計し、場当たり的な推測はしない。

## 哲学

**量より質**：設計されたテストは、より少ないテストケースでより多くのバグを捉える。

### 主要原則

1. **体系的なカバレッジ** - 完全性を保証するために形式的な技法を使用
2. **効率性** - 最小限のテストですべてのシナリオをカバー
3. **保守性** - テストは理解しやすく更新しやすいべき
4. **フレームワーク非依存** - 原則はテストフレームワークに関係なく適用

## テスト設計技法

### 1. 同値分割

**概念**：入力を同じ動作をするグループ（パーティション）に分割。

**なぜ機能するか**：パーティション内の1つの値が動作すれば、すべての値が同様に動作（または失敗）すべき。

```typescript
// Example: Age validation
function validateAge(age: number): boolean {
  return age >= 18 && age <= 120
}

// Equivalence partitions:
// 1. age < 18 (invalid - too young)
// 2. 18 <= age <= 120 (valid)
// 3. age > 120 (invalid - too old)

// Test cases - one from each partition:
test('rejects age 17', () => expect(validateAge(17)).toBe(false))  // Partition 1
test('accepts age 30', () => expect(validateAge(30)).toBe(true))   // Partition 2
test('rejects age 121', () => expect(validateAge(121)).toBe(false)) // Partition 3
```

### 2. 境界値分析

**概念**：バグがよく隠れるパーティションのエッジでテスト。

**なぜ機能するか**：境界条件でのオフバイワンエラーは一般的。

```typescript
// For age validation, boundaries are: 18, 120

// Boundary test cases:
test('rejects age 17 (18-1)', () => expect(validateAge(17)).toBe(false))
test('accepts age 18 (min)', () => expect(validateAge(18)).toBe(true))
test('accepts age 120 (max)', () => expect(validateAge(120)).toBe(true))
test('rejects age 121 (120+1)', () => expect(validateAge(121)).toBe(false))

// Common pattern: test [min-1, min, max, max+1]
```

### 3. デシジョンテーブルテスティング

**概念**：複数条件の複雑なロジックの場合、テーブルを使用してすべての組み合わせがカバーされていることを保証。

**なぜ機能するか**：体系的にすべての論理パスをカバーし、見落としたシナリオを防ぐ。

```typescript
// Example: User access control
// Conditions: isLoggedIn, isPremium, isActive
// Actions: allowAccess

/*
Decision Table:
| isLoggedIn | isPremium | isActive | allowAccess |
|------------|-----------|----------|-------------|
| false      | *         | *        | false       |
| true       | false     | false    | false       |
| true       | false     | true     | true        |
| true       | true      | false    | false       |
| true       | true      | true     | true        |

Note: * means "don't care" - value doesn't affect outcome
*/

// Test cases derived from table:
test('denies access when not logged in', () => {
  expect(canAccess(false, false, false)).toBe(false)
  expect(canAccess(false, true, true)).toBe(false)  // Premium doesn't matter
})

test('denies access when inactive', () => {
  expect(canAccess(true, false, false)).toBe(false)
  expect(canAccess(true, true, false)).toBe(false)
})

test('allows access for logged in, active free users', () => {
  expect(canAccess(true, false, true)).toBe(true)
})

test('allows access for logged in, active premium users', () => {
  expect(canAccess(true, true, true)).toBe(true)
})
```

## カバレッジ目標

### 推奨目標

業界のベストプラクティスとコスト対効果分析に基づく：

- **C0（ステートメントカバレッジ）**：最低80%
- **C1（ブランチカバレッジ）**：最低70%

### なぜこの数値か？

- **80/70ルール**：収穫逓減なしでほとんどのクリティカルパスをカバー
- **コスト vs 効果**：90%を超えると、限界利益のために労力が指数関数的に増加
- **クリティカルパスに焦点**：100%カバレッジはバグフリーコードを保証しない

### カバレッジの測定

```bash
# Most frameworks support coverage reporting
npm test -- --coverage          # Jest, Vitest
yarn test --coverage            # With yarn
pytest --cov=src tests/         # Python
```

### カバレッジ分析

```markdown
優先カバレッジ領域：
1. **重要なビジネスロジック** - 支払い、認証、データ整合性
2. **パブリックAPI** - すべての公開インターフェース
3. **エラーハンドラー** - 例外パス
4. **複雑な条件分岐** - 決定ポイント

低優先度：
- ロジックのないゲッター/セッター
- フレームワーク生成コード
- シンプルなデータ構造
- 設定ファイル
```

## テスト設計ワークフロー

### ステップ1：テスト単位を特定

テスト可能な単位に分解（通常はpublicメソッド）：

```typescript
// ✅ Good: Test one method at a time
describe('UserService.validateAge', () => {
  // Tests for validateAge
})

// ❌ Avoid: Testing entire class at once
describe('UserService', () => {
  // Mixing tests for multiple methods
})
```

### ステップ2：テストシナリオを設計

各単位について：

1. **同値パーティションをリスト**
2. **境界値を特定**
3. **複雑なロジックの場合はデシジョンテーブルを作成**
4. **体系的にテストケースを導出**

### ステップ3：テストケースを書く

```typescript
// Clear test structure - one assertion focus per test
describe('validateAge', () => {
  // Equivalence partitions
  describe('invalid ages', () => {
    test('rejects negative age', () => {
      expect(validateAge(-1)).toBe(false)
    })

    test('rejects age above maximum', () => {
      expect(validateAge(150)).toBe(false)
    })
  })

  // Boundary values
  describe('boundary conditions', () => {
    test('accepts minimum valid age', () => {
      expect(validateAge(18)).toBe(true)
    })

    test('rejects one below minimum', () => {
      expect(validateAge(17)).toBe(false)
    })
  })

  // Valid partition
  describe('valid ages', () => {
    test('accepts typical adult age', () => {
      expect(validateAge(30)).toBe(true)
    })
  })
})
```

## 他の原則との統合

### テストに適用されるオッカムの剃刀

```typescript
// ❌ Over-engineered
class AgeValidatorTestBuilder {
  withAge(age: number) { ... }
  withContext(ctx: any) { ... }
  build() { ... }
}

// ✅ Simple and direct
test('validates age correctly', () => {
  expect(validateAge(30)).toBe(true)
})
```

### 可読性のあるテスト

プロダクションコードと同じ可読性原則に従う：

- **明確な命名**：テスト名が検証内容を説明
- **1つの焦点**：各テストが1つの特定の動作をチェック
- **Arrange-Act-Assert**：明確な構造
- **最小限のセットアップ**：テストに必要なものだけ

```typescript
// ✅ Readable test
test('denies access to inactive users', () => {
  // Arrange
  const user = { isActive: false, isPremium: true }

  // Act
  const result = canAccess(user)

  // Assert
  expect(result).toBe(false)
})
```

### テストのミラーの法則

認知限界を尊重（7±2項目）：

```typescript
// ❌ Too many test cases in one describe
describe('validation', () => {
  test('case 1', ...)
  test('case 2', ...)
  // ... 15 more tests
})

// ✅ Grouped into categories
describe('validation', () => {
  describe('email validation', () => {
    // 3-5 tests
  })

  describe('password validation', () => {
    // 3-5 tests
  })

  describe('username validation', () => {
    // 3-5 tests
  })
})
```

## フレームワーク非依存パターン

これらの技法はどのテストフレームワークでも動作：

### Jest / Vitest

```typescript
describe('unit', () => {
  test('behavior', () => {
    expect(actual).toBe(expected)
  })
})
```

### Mocha / Chai

```typescript
describe('unit', () => {
  it('should behavior', () => {
    expect(actual).to.equal(expected)
  })
})
```

### Pytest

```python
class TestUnit:
    def test_behavior(self):
        assert actual == expected
```

### RSpec

```ruby
describe 'unit' do
  it 'behavior' do
    expect(actual).to eq(expected)
  end
end
```

## 一般的な落とし穴

### 1. ランダムなテスト

```typescript
// ❌ No systematic approach
test('it works', () => {
  expect(validateAge(25)).toBe(true)
  expect(validateAge(50)).toBe(true)
  expect(validateAge(75)).toBe(true)
  // Why these numbers? Missing boundaries!
})

// ✅ Systematic design
test('accepts minimum valid age (boundary)', () => {
  expect(validateAge(18)).toBe(true)
})

test('accepts typical valid age (equivalence)', () => {
  expect(validateAge(30)).toBe(true)
})

test('accepts maximum valid age (boundary)', () => {
  expect(validateAge(120)).toBe(true)
})
```

### 2. 振る舞いではなく実装のテスト

```typescript
// ❌ Coupled to implementation
test('calls validateAge internally', () => {
  const spy = jest.spyOn(service, 'validateAge')
  service.registerUser({ age: 30 })
  expect(spy).toHaveBeenCalled()  // Brittle!
})

// ✅ Test behavior
test('registers users with valid age', () => {
  const result = service.registerUser({ age: 30 })
  expect(result.success).toBe(true)
})
```

### 3. 不完全なカバレッジ

```typescript
// ❌ Missing boundary cases
test('validates age', () => {
  expect(validateAge(30)).toBe(true)  // Only happy path
})

// ✅ Comprehensive coverage
test('rejects below minimum', () => expect(validateAge(17)).toBe(false))
test('accepts minimum', () => expect(validateAge(18)).toBe(true))
test('accepts valid age', () => expect(validateAge(30)).toBe(true))
test('accepts maximum', () => expect(validateAge(120)).toBe(true))
test('rejects above maximum', () => expect(validateAge(121)).toBe(false))
```

## クイックリファレンス

### テスト設計チェックリスト

各パブリックメソッド/関数について：

- [ ] 同値パーティションを特定
- [ ] 各パーティションから1つの値をテスト
- [ ] 境界値を特定
- [ ] 各境界について[min-1, min, max, max+1]をテスト
- [ ] 複雑なロジック（3つ以上の条件）にはデシジョンテーブルを作成
- [ ] C0カバレッジ ≥ 80%を検証
- [ ] C1カバレッジ ≥ 70%を検証
- [ ] テストが可読性と保守性があることを確認

### 各技法を使用する場合

| 技法 | 使用する場合 | 例 |
| --- | --- | --- |
| 同値分割 | 入力範囲、カテゴリ | 年齢検証、ユーザーロール |
| 境界値分析 | 数値範囲、制限 | 最小/最大値、配列境界 |
| デシジョンテーブル | 複数条件（3つ以上） | アクセス制御、状態マシン |

## 関連する原則

### コア原則

- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - オッカムの剃刀（シンプルさ）、Miller's Law（複雑さ制限）

### 開発プラクティス

- [@./TDD_RGRC.md](./TDD_RGRC.md) - 実装のためのテストファーストアプローチ
- [@./READABLE_CODE.md](./READABLE_CODE.md) - テストコードの明確性
- [@./PROGRESSIVE_ENHANCEMENT.md](./PROGRESSIVE_ENHANCEMENT.md) - シンプルに始め、カバレッジを徐々に強化

## 覚えておくこと

> "テストの目標は100%カバレッジを達成することではなく、設計されたテストで効率的にバグを捉えることである。"

**重要なポイント**：

- **体系的 > ランダム**：形式的な技法を使用し、推測はしない
- **質 > 量**：少数の設計されたテストが多数のランダムなテストに勝る
- **境界が重要**：ほとんどのバグはエッジに隠れている
- **シンプルに保つ**：テストはプロダクションコードよりも理解しやすいべき

**決定フレームワーク**：

テストを書く前に尋ねる：

1. 同値パーティションは何か？
2. 境界値は何か？
3. ロジックはデシジョンテーブルが必要なほど複雑か？
4. テストはすべての意味のあるシナリオをカバーしているか？
5. カバレッジを維持しながらこれらのテストを簡素化できるか？
