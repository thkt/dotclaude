---
summary: |
  同値分割、境界値分析、デシジョンテーブルを使用した体系的なテスト設計。
  高品質なテスト生成のためのフレームワーク非依存の原則。
  量より質 - 効率的に実際のバグをキャッチするテストを設計。
decision_question: "テストケースはすべての意味のあるシナリオを効率的にカバーしているか？"
---

# テスト生成 - 体系的なテスト設計

**コア原則**: アドホックな推測ではなく、実証された技法を使用して体系的にテストを設計する。

## 哲学

**量より質**: 適切に設計されたテストは、より少ないテストケースでより多くのバグをキャッチする。

### 主要原則

1. **体系的なカバレッジ** - 完全性を確保するために正式な技法を使用
2. **効率性** - 最小限のテストですべてのシナリオをカバー
3. **メンテナンス性** - テストは理解しやすく更新しやすいべき
4. **フレームワーク非依存** - テストフレームワークに関係なく原則は適用

## テスト設計技法

### 1. 同値分割

**概念**: 入力を同じように動作すべきグループ（パーティション）に分割する。

**なぜ機能するか**: パーティション内の1つの値が動作すれば、すべての値が同様に動作（または失敗）するはず。

```typescript
// 例: 年齢検証
function validateAge(age: number): boolean {
  return age >= 18 && age <= 120
}

// 同値パーティション:
// 1. age < 18（無効 - 若すぎる）
// 2. 18 <= age <= 120（有効）
// 3. age > 120（無効 - 高すぎる）

// テストケース - 各パーティションから1つ:
test('17歳を拒否', () => expect(validateAge(17)).toBe(false))  // パーティション1
test('30歳を受け入れ', () => expect(validateAge(30)).toBe(true))   // パーティション2
test('121歳を拒否', () => expect(validateAge(121)).toBe(false)) // パーティション3
```

### 2. 境界値分析

**概念**: バグが潜みやすいパーティションの境界でテストする。

**なぜ機能するか**: 境界条件でオフバイワンエラーがよく発生する。

```typescript
// 年齢検証の場合、境界は: 18, 120

// 境界テストケース:
test('17歳を拒否（18-1）', () => expect(validateAge(17)).toBe(false))
test('18歳を受け入れ（最小）', () => expect(validateAge(18)).toBe(true))
test('120歳を受け入れ（最大）', () => expect(validateAge(120)).toBe(true))
test('121歳を拒否（120+1）', () => expect(validateAge(121)).toBe(false))

// 一般的なパターン: [min-1, min, max, max+1]をテスト
```

### 3. デシジョンテーブルテスト

**概念**: 複数の条件を持つ複雑なロジックの場合、テーブルを使用してすべての組み合わせをカバー。

**なぜ機能するか**: すべての論理パスを体系的にカバーし、見落としを防ぐ。

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

注: * は「気にしない」- 値は結果に影響しない
*/

// テーブルから導出されたテストケース:
test('ログインしていない場合はアクセス拒否', () => {
  expect(canAccess(false, false, false)).toBe(false)
  expect(canAccess(false, true, true)).toBe(false)  // Premiumは関係ない
})

test('非アクティブの場合はアクセス拒否', () => {
  expect(canAccess(true, false, false)).toBe(false)
  expect(canAccess(true, true, false)).toBe(false)
})

test('ログイン済み、アクティブな無料ユーザーはアクセス許可', () => {
  expect(canAccess(true, false, true)).toBe(true)
})

test('ログイン済み、アクティブなプレミアムユーザーはアクセス許可', () => {
  expect(canAccess(true, true, true)).toBe(true)
})
```

## カバレッジ目標

### 推奨ターゲット

業界のベストプラクティスとコスト対効果分析に基づく:

- **C0（ステートメントカバレッジ）**: 最低80%
- **C1（ブランチカバレッジ）**: 最低70%

### なぜこの数字か

- **80/70ルール**: 収穫逓減なく最も重要なパスをカバー
- **コスト対効果**: 90%を超えると、限界的な利益のために労力が指数関数的に増加
- **クリティカルパスに集中**: 100%カバレッジはバグフリーのコードを保証しない

### カバレッジの測定

```bash
# ほとんどのフレームワークがカバレッジレポートをサポート
npm test -- --coverage          # Jest, Vitest
yarn test --coverage            # With yarn
pytest --cov=src tests/         # Python
```

### カバレッジ分析

```markdown
優先カバレッジ領域:
1. **重要なビジネスロジック** - 支払い、認証、データ整合性
2. **パブリックAPI** - すべての公開インターフェース
3. **エラーハンドラー** - 例外パス
4. **複雑な条件** - 決定ポイント

低優先度:
- ロジックのないゲッター/セッター
- フレームワーク生成コード
- シンプルなデータ構造
- 設定ファイル
```

## テスト設計ワークフロー

### ステップ1: テスト単位を特定

テスト可能な単位（通常はパブリックメソッド）に分解:

```typescript
// Good: 一度に1つのメソッドをテスト
describe('UserService.validateAge', () => {
  // validateAgeのテスト
})

// Bad: 避ける: クラス全体を一度にテスト
describe('UserService', () => {
  // 複数メソッドのテストを混在
})
```

### ステップ2: テストシナリオを設計

各単位について:

1. **同値パーティションをリストアップ**
2. **境界値を特定**
3. **複雑なロジックの場合はデシジョンテーブルを作成**
4. **テストケースを体系的に導出**

### ステップ3: テストケースを書く

```typescript
// 明確なテスト構造 - テストごとに1つのアサーションフォーカス
describe('validateAge', () => {
  // 同値パーティション
  describe('無効な年齢', () => {
    test('負の年齢を拒否', () => {
      expect(validateAge(-1)).toBe(false)
    })

    test('最大を超える年齢を拒否', () => {
      expect(validateAge(150)).toBe(false)
    })
  })

  // 境界値
  describe('境界条件', () => {
    test('最小有効年齢を受け入れ', () => {
      expect(validateAge(18)).toBe(true)
    })

    test('最小未満を拒否', () => {
      expect(validateAge(17)).toBe(false)
    })
  })

  // 有効パーティション
  describe('有効な年齢', () => {
    test('典型的な成人年齢を受け入れ', () => {
      expect(validateAge(30)).toBe(true)
    })
  })
})
```

## 他の原則との統合

### テストに適用するオッカムの剃刀

```typescript
// Bad: 過剰エンジニアリング
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

### 読みやすいテスト

本番コードと同じ読みやすさの原則に従う:

- **明確な命名**: テスト名は何を検証するか説明
- **1つのフォーカス**: 各テストは1つの特定の動作をチェック
- **Arrange-Act-Assert**: 明確な構造
- **最小限のセットアップ**: テストに必要なものだけ

```typescript
// Good: 読みやすいテスト
test('非アクティブユーザーへのアクセスを拒否', () => {
  // Arrange
  const user = { isActive: false, isPremium: true }

  // Act
  const result = canAccess(user)

  // Assert
  expect(result).toBe(false)
})
```

### テストのためのミラーの法則

認知限界（7±2項目）を尊重:

```typescript
// Bad: 1つのdescribeに多すぎるテストケース
describe('validation', () => {
  test('case 1', ...)
  test('case 2', ...)
  // ... さらに15テスト
})

// Good: カテゴリにグループ化
describe('validation', () => {
  describe('メール検証', () => {
    // 3-5テスト
  })

  describe('パスワード検証', () => {
    // 3-5テスト
  })

  describe('ユーザー名検証', () => {
    // 3-5テスト
  })
})
```

## フレームワーク非依存パターン

これらの技法はどのテストフレームワークでも動作:

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
  // なぜこの数字？境界が欠落！
})

// Good: 体系的な設計
test('最小有効年齢を受け入れ（境界）', () => {
  expect(validateAge(18)).toBe(true)
})

test('典型的な有効年齢を受け入れ（同値）', () => {
  expect(validateAge(30)).toBe(true)
})

test('最大有効年齢を受け入れ（境界）', () => {
  expect(validateAge(120)).toBe(true)
})
```

### 2. 動作ではなく実装をテスト

```typescript
// Bad: 実装に結合
test('内部でvalidateAgeを呼び出す', () => {
  const spy = jest.spyOn(service, 'validateAge')
  service.registerUser({ age: 30 })
  expect(spy).toHaveBeenCalled()  // 脆い！
})

// Good: 動作をテスト
test('有効な年齢のユーザーを登録', () => {
  const result = service.registerUser({ age: 30 })
  expect(result.success).toBe(true)
})
```

### 3. 不完全なカバレッジ

```typescript
// Bad: 境界ケースが欠落
test('年齢を検証', () => {
  expect(validateAge(30)).toBe(true)  // ハッピーパスのみ
})

// Good: 包括的なカバレッジ
test('最小未満を拒否', () => expect(validateAge(17)).toBe(false))
test('最小を受け入れ', () => expect(validateAge(18)).toBe(true))
test('有効な年齢を受け入れ', () => expect(validateAge(30)).toBe(true))
test('最大を受け入れ', () => expect(validateAge(120)).toBe(true))
test('最大超過を拒否', () => expect(validateAge(121)).toBe(false))
```

## クイックリファレンス

### テスト設計チェックリスト

各パブリックメソッド/関数について:

- [ ] 同値パーティションを特定
- [ ] 各パーティションから1つの値をテスト
- [ ] 境界値を特定
- [ ] 各境界で[min-1, min, max, max+1]をテスト
- [ ] 複雑なロジック（3条件以上）にデシジョンテーブルを作成
- [ ] C0カバレッジ ≥ 80%を検証
- [ ] C1カバレッジ ≥ 70%を検証
- [ ] テストが読みやすくメンテナンス可能

### 各技法をいつ使うか

| 技法 | 使用場面 | 例 |
| --- | --- | --- |
| 同値分割 | 入力範囲、カテゴリ | 年齢検証、ユーザーロール |
| 境界値分析 | 数値範囲、制限 | 最小/最大値、配列境界 |
| デシジョンテーブル | 複数条件（3つ以上） | アクセス制御、状態機械 |

## 関連原則

### コア原則

- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - テストをシンプルでフォーカスしたものに
- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - テストケースの複雑さを制限

### 開発プラクティス

- [@./tdd-rgrc.md](./tdd-rgrc.md) - 実装のためのテストファーストアプローチ
- [@~/.claude/rules/development/READABLE_CODE.md](~/.claude/rules/development/READABLE_CODE.md) - テストコードの明確さ
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - シンプルに始めて、徐々にカバレッジを強化

## 覚えておくこと

> "テストの目標は100%カバレッジを達成することではなく、適切に設計されたテストでバグを効率的にキャッチすること。"

**主要なポイント**:

- **体系的 > ランダム**: 推測ではなく正式な技法を使用
- **質 > 量**: 少数の適切に設計されたテストが多数のランダムテストに勝る
- **境界が重要**: ほとんどのバグは境界に潜む
- **シンプルに保つ**: テストは本番コードより理解しやすいべき

**判断フレームワーク**:

テストを書く前に問う:

1. 同値パーティションは何か？
2. 境界値は何か？
3. ロジックはデシジョンテーブルが必要なほど複雑か？
4. テストはすべての意味のあるシナリオをカバーしているか？
5. カバレッジを維持しながらテストを簡素化できるか？
