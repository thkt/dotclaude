# 回帰テストファースト（Phase 1.5）

修正前にバグを再現する失敗するテストを書く。

## 目的

バグ修正にTDDを適用: Red（再現）→ Green（修正）→ Refactor（クリーン）→ Commit。

## TDDの基礎

TDDの原則とRGRCサイクルの詳細:

- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDDの哲学
- [@~/.claude/skills/tdd-fundamentals/examples/bug-driven.md](~/.claude/skills/tdd-fundamentals/examples/bug-driven.md) - バグ駆動TDDパターン
- [@~/.claude/commands/shared/tdd-cycle.md](~/.claude/commands/shared/tdd-cycle.md) - RGRC実装

## バグ修正へのTDDアプローチ

```text
1. 🔴 Red   - バグを再現するテストを書く（失敗するはず）
2. ✅ 検証 - 正しい理由でテストが失敗することを確認
3. 🟢 Green - 最小限の修正を実装（テストが合格するはず）
4. 🔵 Refactor - 必要に応じてクリーンアップ（テストは緑のまま）
```

## ステップバイステッププロセス

### Step 1: 失敗するテストを書く

報告されたとおりにバグを正確に再現するテストを作成:

```typescript
// Step 1: まず失敗するテストを書く
it('割引が合計を超える場合、負の値ではなく0を返すべき', () => {
  // これがバグ: 0ではなく-50を返した
  const result = calculateTotal(100, 150) // 150%割引
  expect(result).toBe(0) // 期待される動作
})
```

**チェックリスト**:

- [ ] テスト名が期待される動作を説明
- [ ] テストが正確なバグシナリオを再現
- [ ] アサーションが期待される（正しい）動作を示す
- [ ] コメントがバグの内容を説明

### Step 2: 正しい失敗を検証

テストを実行して確認:

```bash
npm test -- --testNamePattern="割引が合計を超える"
```

**検証**:

- ✅ テストが**失敗**する（バグの存在を証明）
- ✅ 失敗理由がバグの説明と一致
- ✅ エラーメッセージが明確

**例**:

```text
FAIL src/utils/pricing.test.ts
  ● 割引が合計を超える場合、負の値ではなく0を返すべき

    expect(received).toBe(expected)

    Expected: 0
    Received: -50
```

テストがすぐに合格する場合 → テストがバグを再現していない → テストを修正。

### Step 3: 修正に進む

テストが正しく失敗したら、Phase 2（実装）に進む。

## メリット

- **[✓] バグが再現可能であることを確認**
  - 修正が機能するか推測不要
  - 明確な合格/不合格基準

- **[✓] 永久に回帰を防止**
  - テストはスイートに残る
  - バグが再発したらCIがキャッチ

- **[✓] 期待される動作を文書化**
  - テストが仕様として機能
  - 将来の開発者が意図を理解

- **[✓] 自信を持ってリファクタリング可能**
  - 安全にコードを改善可能
  - テストが破壊的変更をキャッチ

## 回帰テストをスキップする場合

以下の場合はテスト作成をスキップ:

### テスト不可能な変更

- ❌ ドキュメントのみの変更
- ❌ 設定ファイルの更新
- ❌ README/コメントの修正

### UI のみの修正

- ❌ ロジックのない純粋なCSS/スタイリング問題
- ❌ ビジュアルの配置問題
- ❌ アニメーションのタイミング調整

### 些細で高信頼度

- ❌ 信頼度 > 0.95 かつ些細な修正
- ❌ コード内の明らかなタイポ
- ❌ 明確な解決策を持つnullチェックの欠落

**重要**: スキップする場合でも理由を文書化:

```typescript
// 修正: エッジケース用のnullチェックを追加
// テストスキップ: 些細な修正、信頼度 0.98
if (!user) return null;
```

## 例: 完全なサイクル

### 修正前（バグあり）

```typescript
// バグのあるコード
function calculateTotal(price, discount) {
  return price - discount; // ❌ 負の値を返す可能性!
}

// テストなし
```

### Red フェーズ

```typescript
// 失敗するテストを書く
it('負の合計を返すべきではない', () => {
  const result = calculateTotal(100, 150);
  expect(result).toBe(0); // ❌ 失敗: Expected 0, got -50
})
```

### Green フェーズ（実装）

```typescript
// 最小限の修正
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // ✅ 修正: 非負を保証
}

// テストが合格 ✅
```

### Refactor フェーズ（オプション）

```typescript
// 必要に応じてクリーンアップ
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // よりクリーン
}

// テストはまだ合格 ✅
```

## TDDサイクルとの統合

回帰テストはRGRCの**Redフェーズ**:

```text
Phase 1.5: 回帰テスト（ここにいます）
  ↓ Red: テスト失敗
Phase 2: 実装
  ↓ Green: テスト合格
Phase 3: 検証
  ↓ Refactor: コードをクリーン
Phase 3.5: テスト生成（オプション）
  ↓ 追加テスト
完了定義
```

## 出力フォーマット

```markdown
✅ 回帰テスト作成完了

📝 テスト: [テスト名]
📁 ファイル: [path/to/test.ts:line]
🔴 ステータス: 失敗（期待通り）
🎯 再現: [バグの説明]

次: 修正を実装（Phase 2）
```

## 参照

- [@~/.claude/skills/tdd-fundamentals/SKILL.md](~/.claude/skills/tdd-fundamentals/SKILL.md) - TDDの基礎
- [@~/.claude/commands/shared/tdd-cycle.md](~/.claude/commands/shared/tdd-cycle.md) - RGRCの詳細
- [@~/.claude/commands/shared/test-generation.md](~/.claude/commands/shared/test-generation.md) - テストパターン
