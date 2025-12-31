# テスト準備（フェーズ0 - インタラクティブテストアクティベーション）

このモジュールは仕様からの事前TDDテスト生成を処理します。

## 目的

仕様から**スキップ状態**でテストケースを生成し、真のBaby Steps TDDのためにユーザー確認で1つずつアクティベート。

## TDD基礎リファレンス

コアTDD概念とテスト生成パターン:

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD哲学
- [@~/.claude/skills/generating-tdd-tests/references/feature-driven.md](~/.claude/skills/generating-tdd-tests/references/feature-driven.md) - 機能駆動パターン
- [@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - テスト生成パターン

## 使用タイミング

spec.mdが存在しFR-xxx要件またはGiven-When-Thenシナリオを含む場合。

## ステップ1: スキップ済みテストを生成

スキップモードでtest-generatorを使用してテストスキャフォールドを作成。

**詳細なtest-generatorパターン**:
[@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md#pattern-1-spec-driven-generation-feature-development)

**クイック呼び出し**:

```typescript
Task({
  subagent_type: "test-generator",
  description: "仕様からスキップ済みテストを生成",
  prompt: `
機能: "${featureDescription}"
仕様: ${specContent}

スキップモードでテストを生成:
1. FR-xxx要件 → スキップ済みテストケース [✓]
2. Given-When-Thenシナリオ → スキップ済み実行可能テスト [✓]
3. テスト順序: シンプル → 複雑（Baby Steps順） [→]
4. フレームワーク適切なスキップマーカーを使用:
   - Jest/Vitest: it.skip() + // TODO: [SKIP] コメント
   - 不明: コメントアウト + // TODO: [SKIP] マーカー

出力: 全テストがスキップ状態のテストファイル。
アクティベーション順序の推奨を含める。
  `
})
```

**shared/test-generation.mdを参照**:

- フレームワーク固有のスキップマーカー
- ベストプラクティス
- 一般的な問題と解決策

## ステップ2: テストキューを表示

生成後、テストアクティベーションキューを表示:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

テストキュー（Baby Steps順）

| # | テスト名 | ステータス | 複雑さ |
|---|----------|----------|--------|
| 1 | ゼロ入力を処理 | SKIP | シンプル |
| 2 | 基本ケースを計算 | SKIP | 基本 |
| 3 | 閾値ロジックを適用 | SKIP | 中程度 |
| 4 | エッジケースを処理 | SKIP | 複雑 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ステップ3: インタラクティブアクティベーションループ

キュー内の各テストについて、アクティベート前にユーザーにプロンプト:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RGRCサイクル 1/4

次のテストをアクティベートしますか？

テスト: "ゼロ入力を処理"
ファイル: src/utils/discount.test.ts:15
元: FR-001（ゼロ購入処理）

```typescript
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Y] アクティベートしてRedフェーズに入る
[S] 次のテストにスキップ
[Q] テスト生成を終了

```markdown

## ステップ4: アクティベートしてRedフェーズに入る

ユーザー確認（Y）で:

1. テストから**スキップマーカーを削除**
2. **テスト実行** → 失敗を確認（Redフェーズ）
3. **Greenフェーズに進む** → 最小限のコードを実装
4. **必要に応じてRefactor**
5. 次のテストのために**ステップ3に戻る**

```typescript
// アクティベート前:
it.skip('handles zero input', () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1)
})

// アクティベート後:
it('handles zero input', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
```

## 進捗トラッキング

各サイクル後に進捗を表示:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

進捗: 2/4 テスト完了

| # | テスト名 | ステータス |
|---|----------|----------|
| 1 | ゼロ入力を処理 | PASS |
| 2 | 基本ケースを計算 | PASS |
| 3 | 閾値ロジックを適用 | SKIP |
| 4 | エッジケースを処理 | SKIP |

Red -> Green -> Refactor -> Commit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## メリット

- **真のBaby Steps**: 一度に1テスト、ユーザー制御のペース
- **Spec駆動**: Given-When-Thenシナリオから派生したテスト
- **アクション前の確認**: サプライズなし、意図的な進捗
- **明確な進捗**: サイクルのどこにいるか常に把握

## TDDとの統合

```text
フェーズ0: test-generatorが全テストをスキップ状態で作成
  ↓
ループ:
  ├─ 次のスキップ済みテストを表示
  ├─ 質問: "このテストをアクティベートしますか？" (Y/S/Q)
  ├─ Yの場合:
  │   ├─ スキップマーカーを削除
  │   ├─ Red: テスト実行（失敗）
  │   ├─ Green: 実装
  │   ├─ Refactor: クリーンアップ
  │   └─ Commit: 状態を保存
  └─ 次のテスト
  ↓
全テストがアクティベートされ合格
```
