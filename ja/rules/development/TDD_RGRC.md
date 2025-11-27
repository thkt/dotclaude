# t_wadaのようにテスト駆動開発

## 核心哲学

新機能実装やバグ修正時は、t_wadaのように考え行動する - 厳格なRed-Green-Refactor-Commit（RGRC）サイクルを使い、各ステップがなぜ重要かを深く理解する。

**究極の目標**: 「動作するきれいなコード」（Clean code that works） - Ron Jeffries

## TDDプロセス概要

1. **テストシナリオリストの作成** - 小さなテスト可能な単位に分解し、TodoWriteで追跡
2. **RGRCサイクルの実行** - 一度に1つのシナリオ、最小ステップ、素早く繰り返す

## Baby Steps - TDDの基礎

### 核心概念

**各ステップで可能な限り最小の変更を行う** - これがTDDの成功の鍵

### Baby Stepsが重要な理由

- **即座のエラー特定**: テストが失敗したら、原因は直前の小さな変更にある
- **継続的な動作状態**: コードは常に数秒でグリーンに戻せる
- **高速フィードバック**: 各ステップは最大1-2分
- **自信の構築**: 小さな成功が複合して大きな機能になる

### Baby Stepsの実践例

```typescript
// ❌ 大きなステップ - 複数の変更を一度に
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// ✅ Baby Steps - 一度に1つの変更
// ステップ1: ゼロを返す（最小限でテストを通す）
function calculateTotal(items) {
  return 0;
}

// ステップ2: 基本的な合計（次のテストがこれを駆動）
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ステップ3: 税金サポートを追加（テストが要求したときのみ）
// ... 小さな増分で継続
```

### Baby Stepsのリズム

1. **最小の失敗テストを書く** (30秒)
2. **最小限のコードで通す** (1分)
3. **テストを実行** (10秒)
4. **必要なら小さなリファクタリング** (30秒)
5. **グリーンならコミット** (20秒)

合計サイクル: 約2分

## RGRCサイクルの実装

1. **Redフェーズ - 失敗するテストを最初に書く**

   ```bash
   npm test
   ```

   テストを書く → 正しく失敗することを確認 → 具体的で焦点を絞る

2. **Greenフェーズ - 最小限の実装**

   ```bash
   npm test
   ```

   パスするのに十分なコードのみ → 「罪を犯してもよい」 → 余分な機能は我慢

3. **Refactorフェーズ - コード品質の改善**

   ```bash
   npm test
   ```

   重複を除去 → 構造/可読性を改善 → 常にテストを緑に保つ

4. **Commitフェーズ - 進捗を保存**

   ```bash
   git add -A && git commit -m "feat: [説明] (RGRC完了)"
   ```

   テスト + 実装を含める → メッセージでRGRCを参照

## t_wadaのように考える

- **小さなステップ**: 「なぜステップを小さくするのか？」 - 各ステップが特定のことを教えてくれるから
- **素早いイテレーション**: 「このサイクルをもっと速くできるか？」 - スピードが設計の問題を早期に明らかにする
- **テスト失敗の理由**: 「正しい理由で失敗しているか？」 - 間違った失敗は間違った理解を意味する
- **実践を通じた学習**: 「このサイクルから何を学んだか？」 - 各サイクルは単なる進捗ではなく学習機会

## TodoWriteとの統合

ワークフロー例:

```markdown
# テストシナリオリスト
1. ⏳ ユーザーはメールとパスワードで登録できる
2. ⏳ 無効なメールで登録に失敗する
3. ⏳ 弱いパスワードで登録に失敗する
4. ⏳ 既存のメールでは登録できない

# 現在のRGRCサイクル（シナリオ1用）
1.1 ❌ Red: ユーザー登録の失敗するテストを書く
1.2 ⏳ Green: 最小限の登録ロジックを実装
1.3 ⏳ Refactor: バリデーションロジックを抽出
1.4 ⏳ Commit: 登録実装を保存
```

## TDDをスキップする場合

スキップ: プロトタイプ、外部API（モックを使用）、使い捨てスクリプト

## Claude Codeでの利点

フェーズごとの明確な境界、過度な設計の防止、自己文書化されたテスト、自然なチェックポイント

## テスト設計技法

テストを書く前に、体系的なテスト設計を適用:

### クイックテスト設計ステップ

1. **分割を特定** - 同値クラスは何か？
2. **境界を見つける** - 境界[min, max]はどこか？
3. **複雑なロジック？** - 3以上の条件にはデシジョンテーブルを使用

### 例: 体系的なテスト設計

```typescript
// テスト対象の関数
function canPurchase(age: number, balance: number): boolean {
  return age >= 18 && balance >= 10
}

// 1. 同値分割:
// - age: <18, >=18
// - balance: <10, >=10

// 2. 境界値:
// - age: 17, 18
// - balance: 9, 10

// 3. テストケース（Redフェーズ）:
test('18歳未満を拒否', () => expect(canPurchase(17, 10)).toBe(false))  // 境界
test('18歳で十分な残高を受理', () => expect(canPurchase(18, 10)).toBe(true))  // 最小境界
test('十分な年齢で低残高を拒否', () => expect(canPurchase(20, 9)).toBe(false))  // 境界
test('十分な年齢と残高を受理', () => expect(canPurchase(20, 10)).toBe(true))  // 有効な分割
```

**詳細なテスト設計技法については**、[@~/.claude/ja/rules/development/TEST_GENERATION.md](~/.claude/ja/rules/development/TEST_GENERATION.md)を参照:

- 同値分析
- 境界値分析
- デシジョンテーブルテスト
- カバレッジ目標（C0: 80%, C1: 70%）

## 関連する原則

- [@~/.claude/ja/rules/reference/OCCAMS_RAZOR.md](~/.claude/ja/rules/reference/OCCAMS_RAZOR.md) - Baby Stepsはシンプルさの原則を体現
- [@~/.claude/ja/rules/development/TEST_GENERATION.md](~/.claude/ja/rules/development/TEST_GENERATION.md) - 体系的なテスト設計技法
