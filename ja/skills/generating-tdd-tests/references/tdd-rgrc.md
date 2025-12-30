# t_wadaスタイルのテスト駆動開発

## 核心哲学

新機能の実装やバグ修正を行う際は、t_wadaのように考え行動する - 厳密なRed-Green-Refactor-Commit（RGRC）サイクルを使用し、各ステップがなぜ重要かを深く理解する。

**究極の目標**: "Clean code that works"（動作するきれいなコード）- Ron Jeffries

## TDDプロセス概要

1. **テストシナリオリストを作成** - 小さなテスト可能な単位に分解し、TodoWriteで追跡
2. **RGRCサイクルを実行** - 一度に1つのシナリオ、最小のステップ、迅速に反復

## Baby Steps - TDDの基盤

### コア概念

**各ステップで可能な限り最小の変更を行う** - これが成功するTDDの鍵

### なぜBaby Stepsが重要か

- **即座のエラー局所化**: テストが失敗したとき、原因は最後の小さな変更にある
- **継続的な動作状態**: コードは常にグリーンまで数秒
- **迅速なフィードバック**: 各ステップは最大1-2分
- **自信の構築**: 小さな成功が大きな機能に積み重なる

### Baby Stepsの実践

```typescript
// Bad: Big Step - Multiple changes at once
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// Good: Baby Steps - One change at a time
// Step 1: Return zero (make test pass minimally)
function calculateTotal(items) {
  return 0;
}

// Step 2: Basic sum (next test drives this)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Step 3: Add tax support (only when test requires it)
// ... continue in tiny increments
```

### Baby Stepsのリズム

1. **最小の失敗するテストを書く**（30秒）
2. **最小限のコードでパスさせる**（1分）
3. **テストを実行**（10秒）
4. **必要に応じて小さなリファクタリング**（30秒）
5. **グリーンならコミット**（20秒）

合計サイクル：約2分

## RGRCサイクル実装

1. **Redフェーズ - まず失敗するテストを書く**

   ```bash
   npm test
   ```

   テストを書く → 正しく失敗することを検証 → 具体的で焦点を絞る

2. **Greenフェーズ - 最小限の実装**

   ```bash
   npm test
   ```

   パスするために十分なコードだけ → "You can sin"（罪を犯せる） → 余計な機能に抵抗

3. **Refactorフェーズ - コード品質を改善**

   ```bash
   npm test
   ```

   重複を削除 → 構造/可読性を改善 → テストを常にグリーンに保つ

4. **Commitフェーズ - 進捗を保存**

   ```bash
   git add -A && git commit -m "feat: [description] (RGRC complete)"
   ```

   テスト + 実装を含める → メッセージでRGRCを参照

## t_wadaのように考える

- **小さなステップ**: 「なぜステップを小さくするのか？」- 各ステップが具体的な何かを教える
- **高速な反復**: 「このサイクルをもっと速くできるか？」- スピードが設計の問題を早期に明らかにする
- **テスト失敗の理由**: 「正しい理由で失敗しているか？」- 間違った失敗は間違った理解を意味する
- **実践を通じた学習**: 「このサイクルから何を学んだか？」- 各サイクルは進捗だけでなく学習の機会

## TodoWriteとの統合

ワークフロー例：

```markdown
# Test Scenario List
1. ⏳ User can register with email and password
2. ⏳ Registration fails with invalid email
3. ⏳ Registration fails with weak password
4. ⏳ Cannot register with existing email

# Current RGRC Cycle (for Scenario 1)
1.1 ❌ Red: Write failing test for user registration
1.2 ⏳ Green: Implement minimal registration logic
1.3 ⏳ Refactor: Extract validation logic
1.4 ⏳ Commit: Save registration implementation
```

## TDDをスキップする場合

以下の場合はスキップ：プロトタイプ、外部API（モックを使用）、使い捨てスクリプト

## Claude Codeでの利点

フェーズごとの明確な境界、過剰設計の防止、自己文書化されたテスト、自然なチェックポイント

## テスト設計技法

テストを書く前に、体系的なテスト設計を適用：

### クイックテスト設計ステップ

1. **パーティションを特定** - 同値クラスは何か？
2. **境界を見つける** - エッジはどこか [min, max]？
3. **複雑なロジック？** - 3つ以上の条件にはデシジョンテーブルを使用

### 例：体系的なテスト設計

```typescript
// Function to test
function canPurchase(age: number, balance: number): boolean {
  return age >= 18 && balance >= 10
}

// 1. Equivalence Partitions:
// - age: <18, >=18
// - balance: <10, >=10

// 2. Boundaries:
// - age: 17, 18
// - balance: 9, 10

// 3. Test Cases (Red Phase):
test('rejects under 18', () => expect(canPurchase(17, 10)).toBe(false))  // Boundary
test('accepts 18 with sufficient balance', () => expect(canPurchase(18, 10)).toBe(true))  // Min boundary
test('rejects sufficient age with low balance', () => expect(canPurchase(20, 9)).toBe(false))  // Boundary
test('accepts sufficient age and balance', () => expect(canPurchase(20, 10)).toBe(true))  // Valid partition
```

**詳細なテスト設計技法については**、[@./TEST_GENERATION.md](./TEST_GENERATION.md)を参照：

- 同値分割
- 境界値分析
- デシジョンテーブルテスティング
- カバレッジ目標（C0: 80%、C1: 70%）

## 関連する原則

- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - オッカムの剃刀（Baby Stepsはシンプルさの原則を体現）
- [@./TEST_GENERATION.md](./TEST_GENERATION.md) - 体系的なテスト設計技法
