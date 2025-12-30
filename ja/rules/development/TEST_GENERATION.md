---
summary: |
  同値分析、境界値分析、デシジョンテーブルを用いた体系的なテスト設計。
  フレームワーク非依存の高品質テスト生成原則。
  量より質 - 効率的にバグを捕捉する設計されたテスト。
decision_question: "テストケースは効率的にすべての意味のあるシナリオをカバーしているか？"
---

# テスト生成 - 体系的なテスト設計

**核心原則**: 当てずっぽうではなく、実証済みの技法を使ってテストを体系的に設計する。

## 哲学

**量より質**: 適切に設計されたテストは、より少ないテストケースでより多くのバグを捕捉する。

### 主要原則

1. **体系的なカバレッジ** - 完全性を確保するために形式的な技法を使用
2. **効率性** - 最小限のテストですべてのシナリオをカバー
3. **保守性** - テストは理解と更新が容易であるべき
4. **フレームワーク非依存** - 原則はテストフレームワークによらず適用可能

## テスト設計技法

### 1. 同値分析（Equivalence Partitioning）

**概念**: 入力を同じように動作すべきグループ（分割）に分ける。

**有効な理由**: 分割内の1つの値が機能すれば、すべての値が同様に機能する（または失敗する）。

```typescript
// 例: 年齢検証
function validateAge(age: number): boolean {
  return age >= 18 && age <= 120
}

// 同値分割:
// 1. age < 18 (無効 - 若すぎる)
// 2. 18 <= age <= 120 (有効)
// 3. age > 120 (無効 - 高齢すぎる)

// テストケース - 各分割から1つ:
test('17歳を拒否', () => expect(validateAge(17)).toBe(false))  // 分割1
test('30歳を受理', () => expect(validateAge(30)).toBe(true))   // 分割2
test('121歳を拒否', () => expect(validateAge(121)).toBe(false)) // 分割3
```

### 2. 境界値分析（Boundary Value Analysis）

**概念**: バグが隠れがちな分割の境界でテストする。

**有効な理由**: オフバイワンエラーは境界条件で一般的。

```typescript
// 年齢検証の境界は: 18, 120

// 境界値テストケース:
test('17歳を拒否（18-1）', () => expect(validateAge(17)).toBe(false))
test('18歳を受理（最小値）', () => expect(validateAge(18)).toBe(true))
test('120歳を受理（最大値）', () => expect(validateAge(120)).toBe(true))
test('121歳を拒否（120+1）', () => expect(validateAge(121)).toBe(false))

// 一般的なパターン: [min-1, min, max, max+1]をテスト
```

### 3. デシジョンテーブルテスト（Decision Table Testing）

**概念**: 複数の条件を持つ複雑なロジックには、テーブルを使ってすべての組み合わせを確実にカバーする。

**有効な理由**: すべての論理経路を体系的にカバーし、シナリオの見落としを防ぐ。

```typescript
// 例: ユーザーアクセス制御
// 条件: isLoggedIn, isPremium, isActive
// アクション: allowAccess

/*
デシジョンテーブル:
| isLoggedIn | isPremium | isActive | allowAccess |
|------------|-----------|----------|-------------|
| false      | *         | *        | false       |
| true       | false     | false    | false       |
| true       | false     | true     | true        |
| true       | true      | false    | false       |
| true       | true      | true     | true        |

注: * は「どちらでも可」 - 値が結果に影響しない
*/

// テーブルから導出されたテストケース:
test('ログインしていない場合アクセス拒否', () => {
  expect(canAccess(false, false, false)).toBe(false)
  expect(canAccess(false, true, true)).toBe(false)  // プレミアムは関係ない
})

test('非アクティブの場合アクセス拒否', () => {
  expect(canAccess(true, false, false)).toBe(false)
  expect(canAccess(true, true, false)).toBe(false)
})

test('ログイン済み、アクティブな無料ユーザーのアクセスを許可', () => {
  expect(canAccess(true, false, true)).toBe(true)
})

test('ログイン済み、アクティブなプレミアムユーザーのアクセスを許可', () => {
  expect(canAccess(true, true, true)).toBe(true)
})
```

## カバレッジ目標

### 推奨目標

業界のベストプラクティスと費用対効果の分析に基づく:

- **C0 (ステートメントカバレッジ)**: 最低80%
- **C1 (ブランチカバレッジ)**: 最低70%

### なぜこの数値か？

- **80/70ルール**: 収穫逓減なしでほとんどの重要な経路をカバー
- **コスト対効果**: 90%を超えると、労力が指数関数的に増加して得られる効果はわずか
- **重要な経路に焦点**: 100%カバレッジはバグゼロを保証しない

### カバレッジの測定

```bash
# ほとんどのフレームワークがカバレッジレポートをサポート
npm test -- --coverage          # Jest, Vitest
yarn test --coverage            # yarnの場合
pytest --cov=src tests/         # Python
```

### カバレッジ分析

```markdown
カバレッジの優先順位:
1. **重要なビジネスロジック** - 決済、認証、データ整合性
2. **パブリックAPI** - 公開されたすべてのインターフェース
3. **エラーハンドラー** - 例外経路
4. **複雑な条件分岐** - 判断ポイント

低優先度:
- ロジックのないゲッター/セッター
- フレームワーク生成コード
- シンプルなデータ構造
- 設定ファイル
```

## テスト設計ワークフロー

### ステップ1: テスト単位を特定

テスト可能な単位に分解（通常はパブリックメソッド）:

```typescript
// Good: 良い例: 一度に1つのメソッドをテスト
describe('UserService.validateAge', () => {
  // validateAgeのテスト
})

// Bad: 避ける: クラス全体を一度にテスト
describe('UserService', () => {
  // 複数のメソッドのテストが混在
})
```

### ステップ2: テストシナリオを設計

各単位に対して:

1. **同値分割をリストアップ**
2. **境界値を特定**
3. **複雑なロジックの場合はデシジョンテーブルを作成**
4. **テストケースを体系的に導出**

### ステップ3: テストケースを記述

```typescript
// 明確なテスト構造 - テストごとに1つのアサーション焦点
describe('validateAge', () => {
  // 同値分割
  describe('無効な年齢', () => {
    test('負の年齢を拒否', () => {
      expect(validateAge(-1)).toBe(false)
    })

    test('最大値を超える年齢を拒否', () => {
      expect(validateAge(150)).toBe(false)
    })
  })

  // 境界値
  describe('境界条件', () => {
    test('最小有効年齢を受理', () => {
      expect(validateAge(18)).toBe(true)
    })

    test('最小値の1つ下を拒否', () => {
      expect(validateAge(17)).toBe(false)
    })
  })

  // 有効な分割
  describe('有効な年齢', () => {
    test('典型的な成人年齢を受理', () => {
      expect(validateAge(30)).toBe(true)
    })
  })
})
```

## 他の原則との統合

### テストへのオッカムの剃刀適用

```typescript
// Bad: 過度に設計
class AgeValidatorTestBuilder {
  withAge(age: number) { ... }
  withContext(ctx: any) { ... }
  build() { ... }
}

// Good: シンプルで直接的
test('年齢を正しく検証', () => {
  expect(validateAge(30)).toBe(true)
})
```

### 可読性のあるテスト

本番コードと同じ可読性原則に従う:

- **明確な命名**: テスト名は検証内容を説明
- **1つの焦点**: 各テストは1つの特定の動作をチェック
- **Arrange-Act-Assert**: 明確な構造
- **最小限のセットアップ**: テストに必要なものだけ

```typescript
// Good: 可読性のあるテスト
test('非アクティブユーザーのアクセスを拒否', () => {
  // Arrange
  const user = { isActive: false, isPremium: true }

  // Act
  const result = canAccess(user)

  // Assert
  expect(result).toBe(false)
})
```

### テストへのミラーの法則

認知限界（7±2項目）を尊重:

```typescript
// Bad: 1つのdescribeに多すぎるテストケース
describe('validation', () => {
  test('case 1', ...)
  test('case 2', ...)
  // ... さらに15個のテスト
})

// Good: カテゴリにグループ化
describe('validation', () => {
  describe('メール検証', () => {
    // 3-5個のテスト
  })

  describe('パスワード検証', () => {
    // 3-5個のテスト
  })

  describe('ユーザー名検証', () => {
    // 3-5個のテスト
  })
})
```

## フレームワーク非依存のパターン

これらの技法はあらゆるテストフレームワークで機能します:

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

## よくある落とし穴

### 1. ランダムテスト

```typescript
// Bad: 体系的なアプローチなし
test('動作する', () => {
  expect(validateAge(25)).toBe(true)
  expect(validateAge(50)).toBe(true)
  expect(validateAge(75)).toBe(true)
  // なぜこれらの数値？境界が欠けている！
})

// Good: 体系的な設計
test('最小有効年齢を受理（境界）', () => {
  expect(validateAge(18)).toBe(true)
})

test('典型的な有効年齢を受理（同値）', () => {
  expect(validateAge(30)).toBe(true)
})

test('最大有効年齢を受理（境界）', () => {
  expect(validateAge(120)).toBe(true)
})
```

### 2. 動作ではなく実装のテスト

```typescript
// Bad: 実装と結合
test('内部的にvalidateAgeを呼び出す', () => {
  const spy = jest.spyOn(service, 'validateAge')
  service.registerUser({ age: 30 })
  expect(spy).toHaveBeenCalled()  // 壊れやすい！
})

// Good: 動作をテスト
test('有効な年齢のユーザーを登録', () => {
  const result = service.registerUser({ age: 30 })
  expect(result.success).toBe(true)
})
```

### 3. 不完全なカバレッジ

```typescript
// Bad: 境界ケースが欠けている
test('年齢を検証', () => {
  expect(validateAge(30)).toBe(true)  // ハッピーパスのみ
})

// Good: 包括的なカバレッジ
test('最小値未満を拒否', () => expect(validateAge(17)).toBe(false))
test('最小値を受理', () => expect(validateAge(18)).toBe(true))
test('有効な年齢を受理', () => expect(validateAge(30)).toBe(true))
test('最大値を受理', () => expect(validateAge(120)).toBe(true))
test('最大値超過を拒否', () => expect(validateAge(121)).toBe(false))
```

## クイックリファレンス

### テスト設計チェックリスト

各パブリックメソッド/関数に対して:

- [ ] 同値分割を特定
- [ ] 各分割から1つの値をテスト
- [ ] 境界値を特定
- [ ] 各境界について[min-1, min, max, max+1]をテスト
- [ ] 複雑なロジック（3以上の条件）にデシジョンテーブルを作成
- [ ] C0カバレッジ ≥ 80%を確認
- [ ] C1カバレッジ ≥ 70%を確認
- [ ] テストが可読性があり保守可能であることを確認

### 各技法を使うべき時

| 技法 | 使用する時 | 例 |
| --- | --- | --- |
| 同値分析 | 入力範囲、カテゴリ | 年齢検証、ユーザー役割 |
| 境界値分析 | 数値範囲、制限 | 最小/最大値、配列境界 |
| デシジョンテーブル | 複数条件（3以上） | アクセス制御、状態機械 |

## 関連する原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)

## 覚えておくべきこと

> 「テストの目標は100%カバレッジを達成することではなく、適切に設計されたテストで効率的にバグを捕捉すること。」

**重要ポイント**:

- **体系的 > ランダム**: 推測ではなく形式的な技法を使用
- **質 > 量**: 少数の適切に設計されたテストは多数のランダムテストに勝る
- **境界が重要**: ほとんどのバグは境界に隠れている
- **シンプルに保つ**: テストは本番コードより理解しやすくあるべき

**判断フレームワーク**:

テストを書く前に、以下を自問:

1. 同値分割は何か？
2. 境界値は何か？
3. ロジックはデシジョンテーブルが必要なほど複雑か？
4. テストはすべての意味のあるシナリオをカバーしているか？
5. カバレッジを維持しながらこれらのテストを簡素化できるか？
