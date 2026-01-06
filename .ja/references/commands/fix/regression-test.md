# リグレッションテストファースト（フェーズ1.5）

修正前にバグを再現する失敗するテストを書く。

## 目的

バグ修正にTDDを適用: Red（再現）→ Green（修正）→ Refactor（クリーン）→ Commit。

## TDD基礎

TDD原則とRGRCサイクルの詳細:

- [@../../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD哲学
- [@../../../../skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - バグ駆動TDDパターン
- [@../../../../references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC実装

## バグ修正へのTDDアプローチ

```text
1. Red   - バグを再現するテストを書く（失敗するはず）
2. Verify  - テストが正しい理由で失敗することを確認
3. Green - 最小限の修正を実装（テストが通るはず）
4. Refactor - 必要に応じてクリーンアップ（テストはグリーンを維持）
```

## ステップバイステッププロセス

### ステップ1: 失敗するテストを書く

報告された通りにバグを正確に再現するテストを作成:

```typescript
// ステップ1: まず失敗するテストを書く
it('when discount exceeds total, should return 0 not negative', () => {
  // これがバグだった: 0ではなく-50を返していた
  const result = calculateTotal(100, 150) // 150%割引
  expect(result).toBe(0) // 期待される動作
})
```

**チェックリスト**:

- [ ] テスト名が期待される動作を説明
- [ ] テストが正確なバグシナリオを再現
- [ ] アサーションが期待される（正しい）動作を示す
- [ ] コメントがバグの内容を説明

### ステップ2: 正しい失敗を確認

テストを実行して確認:

```bash
npm test -- --testNamePattern="discount exceeds total"
```

**確認**:

- [x] テストが**失敗する**（バグの存在を証明）
- [x] 失敗理由がバグの説明と一致
- [x] エラーメッセージが明確

**例**:

```text
FAIL src/utils/pricing.test.ts
  ● when discount exceeds total, should return 0 not negative

    expect(received).toBe(expected)

    Expected: 0
    Received: -50
```

テストがすぐに通る場合 → テストがバグを再現していない → テストを修正。

### ステップ3: 修正に進む

テストが正しく失敗したら、フェーズ2（実装）に進む。

## メリット

- **[✓] バグが再現可能であることを確認**
  - 修正が機能するか推測不要
  - 明確な合格/不合格基準

- **[✓] 永久にリグレッションを防止**
  - テストはスイートに残る
  - バグが再発したらCIがキャッチ

- **[✓] 期待される動作をドキュメント化**
  - テストが仕様として機能
  - 将来の開発者が意図を理解

- **[✓] 自信を持ったリファクタリングが可能**
  - コードを安全に改善できる
  - テストが破壊的変更をキャッチ

## リグレッションテストをスキップする場合

以下の場合はテスト作成をスキップ:

### テスト不可の変更

- [Skip] ドキュメントのみの変更
- [Skip] 設定ファイルの更新
- [Skip] README/コメントの修正

### UIのみの修正

- [Skip] ロジックのない純粋なCSS/スタイリング問題
- [Skip] 視覚的な配置問題
- [Skip] アニメーションタイミングの調整

### 些細で高信頼度

- [Skip] 信頼度 > 0.95 かつ 些細な修正
- [Skip] コード内の明らかなタイポ
- [Skip] 明確な解決策のある欠落nullチェック

**重要**: スキップする場合でも理由をドキュメント化:

```typescript
// 修正: エッジケース用のnullチェックを追加
// テストスキップ: 些細な修正、信頼度 0.98
if (!user) return null;
```

## 例: 完全なサイクル

### 前（バグあり）

```typescript
// バグのあるコード
function calculateTotal(price, discount) {
  return price - discount; // Bad: 負を返す可能性！
}

// テストなし
```

### Redフェーズ

```typescript
// 失敗するテストを書く
it('should not return negative total', () => {
  const result = calculateTotal(100, 150);
  expect(result).toBe(0); // Bad: 失敗: Expected 0, got -50
})
```

### Greenフェーズ（実装）

```typescript
// 最小限の修正
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // Good: 修正: 非負を保証
}

// テストが通る (PASS)
```

### Refactorフェーズ（オプション）

```typescript
// 必要に応じてクリーンアップ
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // よりクリーン
}

// テストはまだ通る (PASS)
```

## TDDサイクルとの統合

リグレッションテストはRGRCの**Redフェーズ**:

```text
フェーズ1.5: リグレッションテスト（ここ）
  ↓ Red: テストが失敗
フェーズ2: 実装
  ↓ Green: テストが通る
フェーズ3: 検証
  ↓ Refactor: コードをクリーン
フェーズ3.5: テスト生成（オプション）
  ↓ 追加テスト
完了定義
```

## 出力フォーマット

```markdown
リグレッションテスト作成

テスト: [テスト名]
ファイル: [path/to/test.ts:line]
ステータス: Red（失敗 - 期待通り）
再現: [バグ説明]

次: 修正を実装（フェーズ2）
```

## リファレンス

- [@../../../../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD基礎
- [@../../../../references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC詳細
- [@../../../../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md) - テストパターン
