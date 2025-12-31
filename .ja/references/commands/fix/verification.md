# 検証（フェーズ3）

修正が堅固で完全であることを確認するための品質チェックを実行。

## 目的

バグが修正されたと見なす前に、並列品質チェックで修正を検証。

## 品質チェック（並列実行）

最速の検証のためにこれらのチェックを同時に実行:

```bash
# サポートされている場合は並列で実行
npm test -- --findRelatedTests &
npm run lint -- --fix &
npm run type-check &
wait
```

### 個別コマンド

並列実行が利用できない場合は順次実行:

```bash
# 1. 関連ファイルのみテスト（より速い）
npm test -- --findRelatedTests src/utils/pricing.ts

# 2. 自動修正付きリント
npm run lint -- --fix

# 3. 型チェック
npm run type-check

# またはスタックに応じた同等コマンド:
# - yarn test / pnpm test / bun test
# - eslint --fix / tsc --noEmit
```

## 検証チェックリスト

### 1. テストが通る

- [x] リグレッションテストが通る（バグ修正済み）
- [x] 既存テストがすべて通る（リグレッションなし）
- [x] 関連テストが通る（影響領域）

**コマンド**:

```bash
# 全テスト実行
npm test

# または影響を受けるテストのみ実行（より速い）
npm test -- --findRelatedTests [modified-files]
```

**期待される結果**:

```text
PASS src/utils/pricing.test.ts
  ✓ when discount exceeds total, should return 0 not negative
  ✓ calculates basic discount correctly
  ✓ handles zero discount

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### 2. リントが通る

- [x] 新しいリントエラーなし
- [x] 自動修正可能な問題が解決済み
- [WARN] 警告は5未満なら許容

**コマンド**:

```bash
npm run lint -- --fix
```

**期待される結果**:

```text
0 errors, 2 warnings
```

**エラーがある場合のアクション**:

- すべてのエラーを即座に修正
- 時間があれば警告も対処
- リントエラーがある状態でコミットしない

### 3. 型チェックが通る

- [x] 変更されたファイルに型エラーなし
- [x] 関連ファイルに型エラーなし
- [x] TypeScriptコンパイルが成功

**コマンド**:

```bash
npm run type-check
# または: tsc --noEmit
```

**期待される結果**:

```text
No type errors
```

### 4. リグレッションが検出されない

修正が以下を壊していないか確認:

- 関連機能
- エッジケース
- 統合ポイント
- APIコントラクト

**手動スポットチェック**:

```bash
# 開発サーバーを起動して手動テスト
npm run dev

# 確認:
# - 機能が期待通りに動作
# - 関連機能に影響なし
# - コンソールエラーなし
```

## 品質ゲートサマリー

| チェック | ステータス | アクション |
| --- | --- | --- |
| テスト | PASS 全合格 | 進める |
| テスト | FAIL 一部失敗 | 即座に修正 |
| リント | PASS 0エラー | 進める |
| リント | FAIL エラーあり | 全エラーを修正 |
| リント | WARN <5警告 | 許容 |
| 型 | PASS エラーなし | 進める |
| 型 | FAIL エラーあり | 即座に修正 |
| 手動 | PASS 動作する | 進める |
| 手動 | FAIL 問題あり | デバッグ＆修正 |

## 検証が失敗した場合

### テストが失敗

**根本原因調査**:

1. どのテストが失敗？
   - リグレッションテスト → 修正が正しくない
   - 他のテスト → リグレッションを導入

2. なぜ失敗？
   - ロジックエラー → 実装を再検討
   - テストの仮定 → テストを更新または修正

**アクション**:

- フェーズ2（実装）に戻る
- 修正を修正
- 検証を再実行

### リントが失敗

**アクション**:

```bash
# 可能なものを自動修正
npm run lint -- --fix

# 残りの問題を手動で修正
# 具体的なエラーはリント出力を確認
```

### 型チェックが失敗

**アクション**:

```bash
# 具体的なエラーを確認
npm run type-check

# 型エラーを修正
# 必要に応じて型または実装を更新
```

## 検証出力

```markdown
検証完了

テスト:
- リグレッションテスト: PASS
- 全テスト: PASS 18/18 合格
- 関連テスト: PASS 5/5 合格

品質:
- リント: PASS 0エラー、2警告
- 型: PASS エラーなし
- カバレッジ: 78%（維持）

手動チェック:
- 機能動作: PASS
- コンソールエラーなし: PASS
- 関連機能: PASS

次: テスト生成（フェーズ3.5）または完了定義
```

## ファストトラック vs 徹底

### ファストトラック（信頼度 >0.9）

```bash
# 最小限のチェック
npm test -- --findRelatedTests [file]
npm run lint -- --fix [file]
```

### 徹底（信頼度 <0.9）

```bash
# フルテストスイート
npm test

# フルリント
npm run lint -- --fix

# 型チェック
npm run type-check

# 手動テスト
npm run dev
```

## 統合ポイント

- **前**: フェーズ2（実装）
- **次**: フェーズ3.5（テスト生成）または完了
- **失敗した場合**: フェーズ2に戻る

## リファレンス

- [@~/.claude/references/commands/code/quality-gates.md](~/.claude/references/commands/code/quality-gates.md) - 詳細な品質ゲート
- [@~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md](~/.claude/rules/core/AI_OPERATION_PRINCIPLES.md) - 品質基準
