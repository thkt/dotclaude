# TDD基礎

テスト駆動開発の原則と実践方法 - クリーンで動作するコードを構築するために。

## 目的

機能開発とバグ修正のための基礎的なTDD知識とパターンを提供する。

## 核心哲学

**「動作するクリーンなコード」** - Ron Jeffries

テスト駆動開発は単なるテストではなく、以下を生み出す設計手法です：

- **動作するコード**: テストが機能を証明
- **クリーンなコード**: リファクタリングステップで品質を確保
- **自信**: 小さなステップが複合的な成功を築く

## Baby Steps - 基礎

**核心原則**: 各ステップで可能な限り最小の変更を行う

### Baby Stepsが重要な理由

1. **即座のエラー局所化**
   - テストが失敗した時、原因は最後の小さな変更にある
   - 数百行をデバッグする必要がない

2. **継続的な動作状態**
   - コードは常にグリーン状態の数秒先
   - いつでもコミット可能

3. **迅速なフィードバック**
   - 各ステップは最大1-2分
   - 素早い検証ループ

4. **自信の構築**
   - 小さな成功が大きな機能に複合
   - 不安と圧倒感を軽減

### Baby Stepsの実践

```typescript
// ❌ 大きなステップ - 一度に複数の変更
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const afterTax = subtotal * (1 + tax);
  const afterDiscount = afterTax * (1 - discount);
  return afterDiscount;
}

// ✅ Baby Steps - 一度に1つの変更

// ステップ1: ゼロを返す（最小限にテストをパスさせる）
function calculateTotal(items) {
  return 0;
}

// ステップ2: 基本的な合計（次のテストがこれを駆動）
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ステップ3: 税のサポートを追加（テストが要求する時のみ）
function calculateTotal(items, tax) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + tax);
}

// ... 小さな増分で続ける
```

### Baby Stepsのリズム

完全なサイクルは約**2分**かかるべきです：

1. **最小の失敗するテストを書く** (30秒)
2. **最小のコードでパスさせる** (1分)
3. **テストを実行** (10秒)
4. **必要に応じて小さなリファクタリング** (30秒)
5. **グリーンならコミット** (20秒)

**合計サイクル**: 約2分

## RGRCサイクル

テスト駆動開発の4つのフェーズ：

### 🔴 Red - 失敗するテストを書く

**目標**: 「完了」とは何かを定義する

- 失敗するテストを書く
- 正しい理由で失敗することを確認
- テストは小さく焦点を当てる
- 期待される動作の明確なアサーション

**終了条件**: 期待通りにテストが失敗する

### 🟢 Green - パスさせる

**目標**: できるだけ速く動作するコードにする

- テストをパスさせる**最小限**のコードを書く
- まだ優雅さを気にしない
- 素早く汚いコードは許容される
- 機能に焦点を当て、形式ではない

**終了条件**: テストが一貫してパスする

### 🔵 Refactor - クリーンアップ

**目標**: 動作を変更せずにコード品質を改善する

- SOLID原則を適用
- 重複を削除 (DRY)
- 命名と構造を改善
- 必要に応じて抽象化を抽出

**終了条件**: すべてのテストがグリーン、コードがクリーン

### ✅ Commit - 進捗を保存

**目標**: 安定したチェックポイントを作成

- すべてのテストがパス
- 品質チェックがパス
- カバレッジが維持/改善
- コミット準備完了

**終了条件**: 自信 = 1.0

## test-generatorエージェント

`test-generator`エージェントは仕様やバグ説明からテストの足場を作成します。

### 基本的な使用パターン

```typescript
Task({
  subagent_type: "test-generator",
  description: "[ソース]からテストを生成",
  prompt: `
    コンテキスト: "${contextDescription}"
    ソース: ${sourceContent}

    生成:
    1. 要件をカバーするテストケース
    2. エッジケースとエラーシナリオ
    3. 必要に応じて統合テスト

    フレームワーク: [Jest/Vitest/etc]
    スタイル: [AAAパターン/Given-When-Then]
  `
})
```

### スキップモード（機能開発）

仕様駆動開発では、すべてのテストをスキップ状態で生成：

```typescript
スキップモードでテストを生成:
1. FR-xxx要件 → スキップされたテストケース
2. Given-When-Thenシナリオ → スキップされた実行可能テスト
3. テストの順序: シンプル → 複雑（Baby Steps順序）
4. フレームワーク適切なスキップマーカーを使用:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] コメント
   - 不明: コメントアウト + // TODO: [SKIP] マーカー
```

### アクティブモード（バグ修正）

バグ駆動開発では、アクティブなリグレッションテストを生成：

```typescript
アクティブなリグレッションテストを生成:
1. バグを再現するテスト（最初は失敗すべき）
2. バグに関連するエッジケース
3. バグがコンポーネントをまたぐ場合の統合テスト
```

## TDDパターン

### 機能駆動TDD

1. **仕様から開始**
   - spec.mdまたは要件を読む
   - 機能要件（FR-xxx）を識別

2. **テストの足場を生成**
   - スキップモードでtest-generatorを使用
   - すべてのテストはスキップから開始

3. **一度に1つのテストを活性化**
   - ユーザーがテスト活性化を確認
   - Red → Green → Refactor → Commit
   - 次のテストに繰り返し

**参照**: [@./examples/feature-driven.md](./examples/feature-driven.md)

### バグ駆動TDD

1. **バグを再現**
   - バグを実証する失敗するテストを書く
   - 正しい理由でテストが失敗することを確認

2. **バグを修正**
   - 最小限の修正を実装
   - テストがパス

3. **リグレッションを防止**
   - 追加のテストを生成
   - エッジケースをカバー

**参照**: [@./examples/bug-driven.md](./examples/bug-driven.md)

## 重要な原則

### TDDにおけるオッカムの剃刀

- テストをパスする最もシンプルな実装を選択
- テストが要求するまで複雑さを追加しない
- テストがグリーンの時のみリファクタリング

### TDDにおけるYAGNI

- 現在のテストが要求するもののみを実装
- 想像上の将来のニーズのための機能を追加しない
- テストが自然に設計を駆動させる

### TDDにおける段階的拡張

- ハッピーパスから開始
- テストが要求する時にエラーハンドリングを追加
- 複雑さを段階的に構築

## よくある落とし穴

### ❌ コードを書きすぎる

```typescript
// 一度にすべてを実装しない
// テストに各小さな増分を駆動させる
```

### ❌ Redフェーズをスキップ

```typescript
// 常に最初にテストが失敗することを確認
// テストが実際に何かをテストしていることを確認
```

### ❌ リファクタリングしない

```typescript
// リファクタリングは不可欠
// 技術的負債は急速に複合する
```

### ❌ 大きなテストステップ

```typescript
// テストを小さく焦点を当てる
// テストごとに1つの動作
```

## コマンドとの統合

- **`/code`**: spec.mdを使用した機能駆動TDD
- **`/fix`**: リグレッションテストを使用したバグ駆動TDD
- **`/test`**: テスト実行と検証

## 参考文献

- [@~/.claude/rules/development/TDD_RGRC.md](~/.claude/rules/development/TDD_RGRC.md) - 完全なTDD方法論

**実装の詳細について**（コマンドで使用）：

- コマンドはRGRC実装のために `commands/shared/tdd-cycle.md` を参照
- コマンドはtest-generatorパターンのために `commands/shared/test-generation.md` を参照

## 関連する原則

- [@~/.claude/rules/reference/PRINCIPLES.md](~/.claude/rules/reference/PRINCIPLES.md) - 最もシンプルな解決策
- [@~/.claude/rules/reference/PRINCIPLES.md](~/.claude/rules/reference/PRINCIPLES.md) - 必要なものだけを構築
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - 段階的な複雑さ
