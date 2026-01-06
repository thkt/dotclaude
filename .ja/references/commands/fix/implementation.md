# 実装（フェーズ2）

信頼度レベルに基づいて最小限の修正を実装。

## 目的

根本原因分析の信頼度に基づいて適切な防御策を講じて修正を適用。

## 信頼度ベースのアプローチ

フェーズ1の信頼度に基づいて実装戦略を選択:

| 信頼度 | 戦略 | アプローチ |
| --- | --- | --- |
| **高 (>0.9)** | 直接修正 | 直接的な解決策を実装 |
| **中 (0.7-0.9)** | 防御的修正 | チェックとガードを追加 |
| **低 (<0.7)** | エスカレート | `/research`または`/think`に切り替え |

## 高信頼度実装 (>0.9)

根本原因が明確、修正が直接的。

### アプローチ

- 直接的な解決策を実装
- 特定された問題に集中
- 変更を最小限に保つ

### 例

```typescript
// 根本原因: 負の結果のチェックがない
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // Good: 直接的な修正
}
```

## 中信頼度実装 (0.7-0.9)

根本原因は可能性が高いが確実ではない、防御策を追加。

### アプローチ

- ガード付きで修正を実装
- 入力バリデーションを追加
- デバッグ用のロギングを含める

### 例

```typescript
// 防御的チェックを追加
function calculateTotal(price, discount) {
  // 入力をバリデート
  if (price < 0 || discount < 0) {
    console.warn('Invalid pricing values', { price, discount });
    return 0;
  }

  const result = price - discount;
  return Math.max(0, result);
}
```

## 低信頼度 (<0.7) - エスカレーション

信頼度が低い場合は推測しない:

### エスカレーションパス

1. **調査が必要** → `/research`

   ```text
   /research "Why does discount calculation return negative?"
   ```

2. **設計が必要** → `/think` → `/code`

   ```text
   /think "Redesign pricing system with proper validation"
   ```

3. **議論が必要** → ユーザーに質問
   - 要件を明確化
   - エッジケースを議論
   - 期待される動作を確認

## オッカムの剃刀を適用

**原則**: 問題を解決する最もシンプルな解決策を選ぶ。

### Good - シンプルな解決策

```typescript
// 問題: 負を返す可能性
// 解決策: 非負を保証
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}
```

### Bad - 過剰設計

```typescript
// 問題: 負を返す可能性
// 解決策: 複雑なバリデーションフレームワーク（YAGNI！）
class PricingValidator {
  validate(price: number, discount: number): ValidationResult {
    // ... 50行のバリデーションロジック
  }
}
```

**覚えておく**: バグを修正する、システムを再構築しない（`/think`がそれが必要と判断しない限り）。

## 周囲のコードを再構築しない

### Good - 的を絞った修正

```typescript
// 必要なものだけを変更
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // ← この行だけ変更
}

// 周囲のコードはそのまま
function applyTax(total, rate) {
  return total * (1 + rate);
}
```

### Bad - 不要なリファクタリング

```typescript
// バグ修正中に無関係なコードをリファクタリングしない
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}

// Bad: 無関係な関数を「改善」しない
function applyTax(total, rate) {
  // 「一貫性」のためにリファクタリング - 修正の一部ではない！
  const taxAmount = total * rate;
  return total + taxAmount;
}
```

**リファクタリングはRefactorフェーズまたは別のPRで行う。**

## UI問題にはCSSファースト

バグがUI/ビジュアルの場合:

### 優先順序

1. **CSS** - まず純粋なCSS解決策を試す
2. **HTML** - CSSが不十分ならマークアップを調整
3. **JavaScript** - CSS/HTMLで解決できない場合のみ

### 例

```css
/* Good: - レイアウトバグのCSS解決策 */
.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

```javascript
// Bad: Bad - CSS問題にJavaScript
function layoutFix() {
  const container = document.querySelector('.container');
  container.style.display = 'flex';
  // ... 20行のレイアウトロジック
}
```

## 実装チェックリスト

フェーズ3に進む前に:

- [ ] 修正が根本原因に対処（症状だけでなく）
- [ ] リグレッションテストが通る
- [ ] 他のテストが壊れていない
- [ ] 変更が最小限
- [ ] 信頼度レベルが適切
- [ ] オッカムの剃刀を適用

## 迷った場合

修正に不確かな場合:

1. **リグレッションテストを確認** - 通るか？
2. **全テストを実行** - 何か壊れてないか？
3. **自問** - これが最もシンプルな解決策か？

いずれかの答えが「いいえ」または「不明」→ アプローチを再検討。

## 出力フォーマット

```markdown
修正を実装

アプローチ: [直接/防御的]
変更: [簡潔な説明]
ファイル: [変更されたファイル]
信頼度: 0.XX

ステータス:
- [✓] リグレッションテストが通る
- [✓] テストが壊れていない
- [✓] 最小限の変更

次: 検証（フェーズ3）
```

## 統合ポイント

- **前**: フェーズ1.5（リグレッションテスト）
- **次**: フェーズ3（検証）
- **エスカレート**: 信頼度 < 0.7 なら`/research`または`/think`

## リファレンス

- [@../../../../skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - シンプルさの原則
- [@../../../../rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSSファーストアプローチ
