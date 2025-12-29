# 実装（Phase 2）

信頼度レベルに基づいて最小限の修正を実装。

## 目的

根本原因分析の信頼度に基づいて、適切な防御策を講じて修正を適用。

## 信頼度ベースのアプローチ

Phase 1 の信頼度に基づいて実装戦略を選択:

| 信頼度 | 戦略 | アプローチ |
| --- | --- | --- |
| **高 (>0.9)** | 直接修正 | 単純な解決策を実装 |
| **中 (0.7-0.9)** | 防御的修正 | チェックとガードを追加 |
| **低 (<0.7)** | エスカレーション | `/research` または `/think` に切り替え |

## 高信頼度実装（>0.9）

根本原因が明確で、修正が単純。

### アプローチ

- 直接的な解決策を実装
- 特定された問題に集中
- 変更を最小限に保つ

### 例

```typescript
// 根本原因: 負の結果のチェックなし
function calculateTotal(price, discount) {
  const result = price - discount;
  return Math.max(0, result); // ✅ 直接修正
}
```

## 中信頼度実装（0.7-0.9）

根本原因は可能性が高いが確実ではない、防御策を追加。

### アプローチ

- ガード付きで修正を実装
- 入力バリデーションを追加
- デバッグ用のログを含める

### 例

```typescript
// 防御的チェックを追加
function calculateTotal(price, discount) {
  // 入力をバリデート
  if (price < 0 || discount < 0) {
    console.warn('無効な価格値', { price, discount });
    return 0;
  }

  const result = price - discount;
  return Math.max(0, result);
}
```

## 低信頼度（<0.7）- エスカレーション

信頼度が低い場合は推測しない:

### エスカレーションパス

1. **調査が必要** → `/research`

   ```text
   /research "なぜ割引計算が負の値を返すのか?"
   ```

2. **設計が必要** → `/think` → `/code`

   ```text
   /think "適切なバリデーションで価格システムを再設計"
   ```

3. **議論が必要** → ユーザーに確認
   - 要件を明確化
   - エッジケースを議論
   - 期待される動作を確認

## オッカムの剃刀を適用

**原則**: 問題を解決する最もシンプルな解決策を選択。

### ✅ 良い例 - シンプルな解決策

```typescript
// 問題: 負の値を返す可能性
// 解決策: 非負を保証
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}
```

### ❌ 悪い例 - 過剰設計

```typescript
// 問題: 負の値を返す可能性
// 解決策: 複雑なバリデーションフレームワーク（YAGNI!）
class PricingValidator {
  validate(price: number, discount: number): ValidationResult {
    // ... 50行のバリデーションロジック
  }
}
```

**覚えておくこと**: バグを修正する、システムを再構築しない（`/think` がそれが必要と判断しない限り）。

## 周囲のコードを再構築しない

### ✅ 良い例 - 対象を絞った修正

```typescript
// 必要な部分のみ変更
function calculateTotal(price, discount) {
  return Math.max(0, price - discount); // ← この行のみ変更
}

// 周囲のコードはそのまま
function applyTax(total, rate) {
  return total * (1 + rate);
}
```

### ❌ 悪い例 - 不要なリファクタリング

```typescript
// バグ修正中に関係ないコードをリファクタリングしない
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}

// ❌ 関係ない関数を「改善」しない
function applyTax(total, rate) {
  // 「一貫性」のためにリファクタリング - 修正の一部ではない!
  const taxAmount = total * rate;
  return total + taxAmount;
}
```

**リファクタリングはRefactorフェーズまたは別のPRで保存。**

## UI問題にはCSS優先

バグがUI/ビジュアルの場合:

### 優先順位

1. **CSS** - まず純粋なCSSソリューションを試す
2. **HTML** - CSSで不十分な場合にマークアップを調整
3. **JavaScript** - CSS/HTMLで解決できない場合のみ

### 例

```css
/* ✅ 良い例 - レイアウトバグにCSSソリューション */
.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

```javascript
// ❌ 悪い例 - CSS問題にJavaScript
function layoutFix() {
  const container = document.querySelector('.container');
  container.style.display = 'flex';
  // ... 20行のレイアウトロジック
}
```

## 実装チェックリスト

Phase 3 に進む前に:

- [ ] 修正が根本原因に対処（症状だけでなく）
- [ ] 回帰テストが合格
- [ ] 他のテストが壊れていない
- [ ] 変更が最小限
- [ ] 信頼度レベルが適切
- [ ] オッカムの剃刀を適用

## 迷った場合

修正に確信が持てない場合:

1. **回帰テストを確認** - 合格するか?
2. **すべてのテストを実行** - 何か壊れているか?
3. **自問** - これが最もシンプルな解決策か?

いずれかの答えが「いいえ」または「不明」の場合 → アプローチを見直す。

## 出力フォーマット

```markdown
✅ 修正を実装

🔧 アプローチ: [直接/防御的]
📝 変更内容: [簡潔な説明]
📁 ファイル: [変更ファイル]
🎯 信頼度: 0.XX

ステータス:
- [✓] 回帰テスト合格
- [✓] テスト破損なし
- [✓] 最小限の変更

次: 検証（Phase 3）
```

## 統合ポイント

- **前**: Phase 1.5（回帰テスト）
- **次**: Phase 3（検証）
- **エスカレーション**: 信頼度 < 0.7 の場合 `/research` または `/think`

## 参照

- [@~/.claude/rules/reference/PRINCIPLES.md](~/.claude/rules/reference/PRINCIPLES.md) - シンプルさの原則
- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md) - CSS優先アプローチ
