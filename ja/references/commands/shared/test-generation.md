# テスト生成パターン

test-generatorエージェントを使用するための共通パターン。

## 目的

異なるソースからテストを生成するための標準化されたアプローチ。

## 前提条件

TDDの基礎の理解:
[@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md)

## test-generatorエージェント

`test-generator`エージェントは仕様やバグの説明からテストスキャフォールディングを作成します。

### 基本的な呼び出し

```typescript
Task({
  subagent_type: "test-generator",
  model: "haiku",  // テスト生成用の高速モデル
  description: "[ソース]からテストを生成",
  prompt: `[詳細なプロンプト]`
})
```

## パターン1: 仕様駆動生成（機能開発）

**ユースケース**: `/code`コマンド用にspec.mdからテストを生成

**特徴**:

- すべてのテストが最初はスキップ状態
- ユーザーが1つずつ有効化
- シンプル → 複雑の順序（Baby Steps）

**プロンプトテンプレート**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "仕様からスキップテストを生成",
  prompt: `
機能: "${featureDescription}"
仕様: ${specContent}

スキップモードでテストを生成:
1. FR-xxx要件 → スキップされたテストケース [✓]
2. Given-When-Thenシナリオ → スキップされた実行可能テスト [✓]
3. テストの順序: シンプル → 複雑（Baby Steps順序） [→]
4. フレームワーク適切なスキップマーカーを使用:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] コメント
   - 不明: コメントアウト + // TODO: [SKIP] マーカー

出力: すべてのテストがスキップ状態のテストファイル。
有効化順序の推奨を含める。
  `
})
```

**出力例**:

```typescript
// FR-001: ユーザー登録から生成

it.skip('メールフォーマットをバリデート', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('test@example.com')).toBe(true)
})

it.skip('無効なメールを拒否', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('invalid')).toBe(false)
})

// 有効化順序: 1 → 2（シンプル → 複雑）
```

## パターン2: バグ駆動生成（バグ修正）

**ユースケース**: `/fix`コマンド用に回帰テストを生成

**特徴**:

- テストがアクティブ（スキップされていない）
- バグ再現にフォーカス
- エッジケースを含む

**プロンプトテンプレート**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "バグ修正用の回帰テストを生成",
  prompt: `
バグ: "${bugDescription}"
根本原因: "${rootCause}"
適用した修正: "${fixSummary}"

生成:
1. [✓] 元のバグを再現するテスト（今は合格するはず）
2. [→] 修正に関連するエッジケーステスト
3. [→] クロスコンポーネント修正の場合は統合テスト

テストスイートに追加する準備ができたテストコードを返す。
  `
})
```

**出力例**:

```typescript
// 回帰テスト: 割引が価格より大きい場合に負の合計

describe('calculateTotal - 割引エッジケース', () => {
  it('割引が価格を超える場合0を返す', () => {
    // バグ: 0ではなく-50を返した
    expect(calculateTotal(100, 150)).toBe(0)
  })

  it('ゼロ価格を正しく処理', () => {
    expect(calculateTotal(0, 50)).toBe(0)
  })

  it('ゼロ割引を正しく処理', () => {
    expect(calculateTotal(100, 0)).toBe(100)
  })
})
```

## パターン3: カバレッジ駆動生成

**ユースケース**: カバレッジを改善するためのテスト追加

**特徴**:

- 特定の未テストコードパスをターゲット
- エッジケースにフォーカス
- 既存のテストスタイルを維持

**プロンプトテンプレート**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "未カバーのコードパス用テストを生成",
  prompt: `
ファイル: ${filePath}
未カバー行: ${uncoveredLines}
既存テストスタイル: ${testStyle}

未カバーのコードパス用テストを生成:
1. 現在テストされていないエッジケースを特定
2. 既存のテスト命名規則に合わせる
3. 既存のテストと同じアサーションスタイルを使用

目標カバレッジ: 80%以上
  `
})
```

## フレームワーク固有のスキップマーカー

### Jest / Vitest

```typescript
// 単一テストをスキップ
it.skip('テスト名', () => { })

// テストスイートをスキップ
describe.skip('スイート名', () => { })

// 追跡用コメントマーカー
it.skip('テスト名', () => {
  // TODO: [SKIP] FR-001
})
```

### Mocha

```typescript
// .skipでスキップ
it.skip('テスト名', function() { })

// xitでスキップ
xit('テスト名', function() { })
```

### 不明なフレームワーク

```typescript
// コメントアウト + マーカー
// it('テスト名', () => {
//   // TODO: [SKIP] FR-001
//   expect(true).toBe(true)
// })
```

## コマンドとの統合

### `/code` での使用

1. **Phase 0**: すべてのテストをスキップ状態で生成
2. **インタラクティブ**: ユーザーがテストを1つずつ有効化
3. **RGRC**: 各有効化がRed-Green-Refactor-Commitをトリガー

参照: [@~/.claude/skills/generating-tdd-tests/references/feature-driven.md](~/.claude/skills/generating-tdd-tests/references/feature-driven.md)

### `/fix` での使用

1. **Phase 1.5**: まず手動で回帰テスト
2. **Phase 3.5**: 追加テストを生成（オプション）
3. **アクティブ**: テストは即座にアクティブ

参照: [@~/.claude/skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md)

## ベストプラクティス

### 明確なコンテキスト

```typescript
// Good: 良い例 - 具体的なコンテキスト
prompt: `
機能: ユーザーログイン
要件:
- FR-001: メールバリデーション
- FR-002: パスワード強度チェック
仕様: ${specContent}
`

// Bad: 悪い例 - 曖昧なコンテキスト
prompt: `ログイン用のテストを生成`
```

### 明示的なマーカー

```typescript
// Good: 良い例 - 明確なスキップマーカー
it.skip('メールをバリデート', () => {
  // TODO: [SKIP] FR-001
  expect(validateEmail('test@example.com')).toBe(true)
})

// Bad: 悪い例 - マーカーなし
it.skip('メールをバリデート', () => {
  expect(validateEmail('test@example.com')).toBe(true)
})
```

### Baby Steps順序

```typescript
// Good: 良い例 - シンプルから複雑
// 有効化順序: 1 → 2 → 3
it.skip('ゼロ入力を処理', () => { })        // シンプル
it.skip('基本ケースを計算', () => { })     // 基本
it.skip('複雑なシナリオを処理', () => { }) // 複雑

// Bad: 悪い例 - ランダム順序
it.skip('複雑なシナリオを処理', () => { }) // 複雑が最初!
it.skip('ゼロ入力を処理', () => { })
```

## よくある問題

### 問題: テストがフレームワークに合わない

**解決策**: プロンプトで常にフレームワークを指定

```typescript
prompt: `
フレームワーク: Jest
スタイル: AAAパターン（Arrange-Act-Assert）
`
```

### 問題: テストが広すぎる

**解決策**: フォーカスした単一動作テストをリクエスト

```typescript
prompt: `
フォーカスしたテストを生成:
- テストごとに1つの動作
- 明確なテスト名
- 可能な場合は単一アサーション
`
```

### 問題: エッジケースの欠落

**解決策**: エッジケースを明示的にリクエスト

```typescript
prompt: `
エッジケースを含む:
- Null/undefined入力
- 空の配列/文字列
- 境界値
- エラー条件
`
```

## 参照

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDDの基礎
- [@./tdd-cycle.md](./tdd-cycle.md) - RGRCサイクルの詳細
