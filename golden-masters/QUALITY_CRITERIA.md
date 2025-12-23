# Golden Masters - Prompt Quality Standards

Version: 1.0.0
Created: 2025-12-23
Purpose: 理想的な成果物例を蓄積し、プロンプト調整の基準とする

---

## Purpose

Golden Mastersは、**理想的なSOW/Spec/Summaryの実例集**です。これらを参照することで：

1. **品質基準の共有** - チーム全体で「良い成果物」の認識を統一
2. **プロンプト改善** - 何が良いのかを定量化し、プロンプトを調整
3. **学習リソース** - 新規メンバーのオンボーディング資料

## Selection Criteria

### 基本原則

Golden Masterとして選定するには、以下の基準を満たす必要があります：

- **80/100以上のスコア** - sow-spec-reviewerによる評価
- **構造の一貫性** - 必須セクションを網羅
- **実用性** - 実際のプロジェクトで使用され、成功した成果物

---

## SOW Quality Criteria (Total: 100 points)

### 1. Structure (25 points)

必須セクションの網羅性と論理的な構成：

- [ ] **Executive Summary** (5点) - 目的、主要改善領域、既存投資の活用が明確
- [ ] **Problem Analysis** (5点) - Current State、Verified Issues、Inferred Problemsが分類されている
- [ ] **Assumptions & Prerequisites** (5点) - ✓/→/?マーカーで信頼度を明示
- [ ] **Acceptance Criteria** (5点) - Phase別に測定可能な完了条件
- [ ] **Implementation Plan** (5点) - Day別の具体的な実装手順

### 2. Confidence Markers (25 points)

信頼度マーカーの適切な使用：

- [ ] **[✓] Verified Facts** (10点) - 証拠（Evidence）を明示、ファイルパスや実行結果を引用
- [ ] **[→] Inferred Items** (10点) - 推論の根拠を説明、合理的な仮定
- [ ] **[?] Unknowns** (5点) - 不明点を正直に認める、調査が必要な項目を特定

**Good Example**:

```markdown
- [✓] /code は既にモジュール分割済み（ADR 0001） - Evidence: commands/code/（6サブモジュール）
- [→] コンテキスト削減により応答速度とコストが改善される
- [?] コンテキストサイズがLLM性能に影響する具体的な閾値
```

### 3. Actionability (25 points)

実行可能性と具体性：

- [ ] **Concrete Acceptance Criteria** (10点) - 測定可能な完了条件（"improve performance"ではなく"40-50% reduction"）
- [ ] **Measurable Success Metrics** (10点) - 定量的な指標（行数、トークン数、スコア）
- [ ] **Clear Implementation Steps** (5点) - Day別の具体的なタスク分割

**Good Example**:

```markdown
- [ ] [✓] `applying-code-principles`が必須機能を100%維持している
  - 検証: Quick Decision Questions、Priority Order、参照リンクの存在確認
- [ ] [→] 冗長な詳細説明が参照リンクに置き換えられている
  - 検証: `rules/reference/`へのリンクが適切に配置されている
```

### 4. Risk Assessment (25 points)

現実的なリスク評価と緩和策：

- [ ] **Risks Classified by Confidence** (10点) - ✓/→/?でリスクの確実性を分類
- [ ] **Realistic Mitigations** (10点) - 具体的で実行可能な対策
- [ ] **Rollback Procedure** (5点) - 失敗時の復旧手順

**Good Example**:

```markdown
| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| [✓] 既存ワークフロー破壊 | 高 | 中 | 段階的移行、互換性レイヤー、十分なテスト |
```

### Pass Threshold

**80/100以上** - Golden Masterとして採用

---

## Spec Quality Criteria (Total: 100 points)

### 1. Implementability (25 points)

実装可能性 - コードに直接変換できるか：

- [ ] **Functional Requirements with Input/Output** (10点) - 各FRにInput、Output、Validationが明示
- [ ] **Data Model (TypeScript interfaces)** (10点) - 実装可能なデータ構造定義
- [ ] **Implementation Details** (5点) - 具体的なアプローチとコード例

**Good Example**:

```typescript
[→] FR-001: applying-code-principles スキルの機能担保と冗長性削減

- **Input**: 現在の`skills/applying-code-principles/SKILL.md`（430行）
- **Output**: 必須機能を維持した最適化版SKILL.md
- **必須機能（維持必須）**:
  - Quick Decision Questions（4つの判断基準）
  - Project Priority Order（原則の優先順位）
```

### 2. Testability (25 points)

テスト可能性 - 検証方法が明確か：

- [ ] **Test Scenarios (Given-When-Then)** (15点) - 具体的なテストケース
- [ ] **Unit/Integration/E2E Coverage** (10点) - テストレベルの網羅

**Good Example**:

```typescript
describe('Phase 1-A: Context Minimization', () => {
  it('[→] reduces applying-code-principles to <200 lines', () => {
    // Given: current SKILL.md (430 lines)
    // When: reduction script runs
    // Then: output <200 lines, Quick Decision Questions preserved
  });
});
```

### 3. SOW Alignment (25 points)

SOWとの整合性：

- [ ] **1:1 FR to Acceptance Criteria** (15点) - SOWの完了条件とFRが対応
- [ ] **Consistent Terminology** (10点) - 用語の一貫性

### 4. Completeness (25 points)

網羅性 - エッジケースと非機能要件：

- [ ] **Edge Case Coverage** (10点) - 異常系、境界値の考慮
- [ ] **Non-Functional Requirements** (10点) - Performance、Maintainability、Compatibility
- [ ] **Migration Guide** (5点) - 既存ユーザーへの移行手順

### Pass Threshold

**80/100以上** - Golden Masterとして採用

---

## Summary Quality Criteria (Total: 100 points)

### 1. Conciseness (30 points)

簡潔性 - 1-2分で理解できるか：

- [ ] **Purpose (1-2 sentences)** (10点) - 核心を端的に説明
- [ ] **Change Overview** (10点) - Phaseとpriority が明確
- [ ] **Key Points Only** (10点) - 詳細はSOW/Specに委譲

### 2. Actionability (30 points)

実行可能性：

- [ ] **Clear Next Steps** (15点) - 即座に着手すべき内容が明確
- [ ] **Priority Indicators** (15点) - 🔴高/🟡中/🟢低の視覚的な優先度

### 3. Scope Clarity (20 points)

スコープの明確性：

- [ ] **Files to Modify** (10点) - 具体的なファイルパス
- [ ] **Affected Components** (10点) - 影響範囲の特定

### 4. Decision Support (20 points)

意思決定支援：

- [ ] **Discussion Points** (10点) - 判断が必要な項目
- [ ] **Risks** (10点) - 主要なリスクの要約

### Pass Threshold

**80/100以上** - Golden Masterとして採用

---

## Anti-Patterns (Negative Examples)

Golden Mastersに**含めてはいけない**パターン：

### SOW Anti-Patterns

❌ **Vague Acceptance Criteria**

```markdown
- [ ] システムのパフォーマンスを改善する
```

✅ **Good**:

```markdown
- [ ] [→] コンテキストサイズを40-50%削減
  - 測定: wc -l による行数比較
```

❌ **No Confidence Markers**

```markdown
- コンテキスト削減により応答速度が改善される
```

✅ **Good**:

```markdown
- [→] コンテキスト削減により応答速度が改善される（推論）
- [?] 具体的な改善率は測定が必要
```

❌ **Missing Risk Assessment**

```markdown
（リスクセクションが存在しない）
```

❌ **Unrealistic Timeline**

```markdown
Day 1: 全システムのリファクタリング完了
```

### Spec Anti-Patterns

❌ **Missing Data Model**

```markdown
FR-001: ユーザー管理機能を実装
（データ構造の定義がない）
```

❌ **No Test Scenarios**

```markdown
（テストセクションが存在しない、または"適切にテストする"のみ）
```

❌ **Implementation Details Too Vague**

```markdown
- 適切な方法でデータを保存する
- 効率的にクエリを実行する
```

❌ **No Edge Case Consideration**

```markdown
（正常系のみ、エラーハンドリングの記述なし）
```

### Summary Anti-Patterns

❌ **Too Detailed**

```markdown
（5ページ以上のSummary - 詳細はSOWに書くべき）
```

❌ **No Priority**

```markdown
- 機能Aを実装
- 機能Bを実装
- 機能Cを実装
（すべて同じ優先度に見える）
```

❌ **Unclear Scope**

```markdown
- いくつかのファイルを修正
- 関連するコンポーネントに影響
```

---

## Scoring Process

### 自動評価（sow-spec-reviewer）

1. **構造チェック** - 必須セクションの存在確認
2. **マーカーチェック** - ✓/→/?の使用頻度と適切性
3. **具体性チェック** - 測定可能な指標の有無
4. **一貫性チェック** - 用語の統一性

### 手動評価

自動評価で80/100以上のファイルを、人間が最終確認：

1. **実用性** - 実際のプロジェクトで使用され、成功したか
2. **学習価値** - 新規メンバーの参考になるか
3. **独自性** - 他のGolden Mastersと重複しないか

---

## Usage

### 1. Golden Master候補の選定

```bash
# workspace/planning/から候補を探す
find ~/.claude/workspace/planning -name "sow.md" -o -name "spec.md"

# sow-spec-reviewerで評価
# （80/100以上が候補）
```

### 2. golden-masters/への追加

```bash
# 選定理由をコメントで記載
<!--
Golden Master Selection Reason:
- Score: 85/100 (sow-spec-reviewer)
- Project: ESE Spec Kit Integration
- Success: 63% context reduction achieved (target: 40-50%)
- Key Learning: Flag-based on-demand loading pattern
-->
```

### 3. 定期的なレビュー

- **月次**: 新しい成果物を評価し、Golden Mastersを更新
- **四半期**: 古いGolden Mastersの妥当性を再評価

---

## References

- **SOW Template**: [@./documents/sow/](./documents/sow/)
- **Spec Template**: [@./documents/spec/](./documents/spec/)
- **Summary Template**: [@./documents/summary/](./documents/summary/)

---

**Last Updated**: 2025-12-23
