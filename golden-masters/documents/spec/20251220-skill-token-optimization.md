# Specification: スキルファイルのトークン効率最適化

Version: 1.0.0
Based on: SOW v1.0.0
Last Updated: 2025-12-20

---

## 1. Functional Requirements

### 1.1 Phase 1: 二重ロード解消

[✓] FR-001: CLAUDE.mdからapplying-code-principles埋め込みを削除

- Input: ~/.claude/CLAUDE.md
- Output: 参照リンクのみに置換されたCLAUDE.md
- Validation: applying-code-principlesの内容が埋め込まれていない

### 1.2 Phase 2: applying-code-principles最適化

[→] FR-002: 基礎知識説明の削除

- Input: applying-code-principles/SKILL.md (430行)
- Output: ~50行に削減
- Validation: 以下の項目のみ残存
  - frontmatter (name, description, allowed-tools)
  - Purpose (1-2行)
  - Project-Specific Priority Order
  - Reference paths

**削除対象**:

- SOLID原則の説明 → Claudeは既知
- DRY/Occam's Razor/Miller's Law/YAGNIの説明 → Claudeは既知
- すべてのコード例 → 概念は既知
- Best Practices/Don'ts → 一般常識
- Success Metrics → 販促文

### 1.3 Phase 3-6: 他スキル最適化

[→] FR-003: creating-adrs (514行 → ~200行)

- 削除: bashスクリプト例、Expected Improvements、Troubleshooting
- 残す: フェーズ概要、テンプレート選択肢、必須セクション

[→] FR-004: enhancing-progressively (410行 → ~120行)

- 削除: CSS基本構文、完全コード例
- 残す: CSS-First判断基準、判断フローチャート

[→] FR-005: applying-frontend-patterns (362行 → ~180行)

- 削除: React Hooks基本説明、Vue例
- 残す: パターンリスト、適用ルール

[→] FR-006: generating-tdd-tests (325行 → ~195行)

- 削除: 一般テスト技法説明
- 残す: Baby Steps 2分サイクル、RGRCチェックリスト、カバレッジ目標

---

## 2. Data Model

### 2.1 最適化前後の比較

```typescript
interface SkillMetrics {
  current: {
    applyingCodePrinciples: 430;
    creatingAdrs: 514;
    enhancingProgressively: 410;
    applyingFrontendPatterns: 362;
    generatingTddTests: 325;
    total: 2041;
  };
  target: {
    applyingCodePrinciples: 50;   // 88%削減
    creatingAdrs: 200;            // 61%削減
    enhancingProgressively: 120;  // 71%削減
    applyingFrontendPatterns: 180; // 50%削減
    generatingTddTests: 195;      // 40%削減
    total: 745;                   // 64%削減
  };
}
```

### 2.2 スリム化テンプレート

```typescript
interface SlimSkillTemplate {
  frontmatter: {
    name: string;
    description: string;    // 1行のみ
    allowedTools: string[];
  };
  content: {
    purpose: string;        // 1-2行
    projectSpecificRules: object; // Claudeが知らない情報のみ
    references: string[];   // 詳細へのパス
  };
}
```

---

## 3. Implementation Details

### 3.1 applying-code-principles最適化後

```markdown
---
name: applying-code-principles
description: Fundamental software principles - apply project priority order
allowed-tools: Read, Grep, Glob
---

# Code Principles

## Purpose

Apply SOLID, DRY, Occam's Razor, Miller's Law, YAGNI with project-specific priority.

## Project Priority Order

When principles conflict:

1. **Safety First** - Security, data integrity
2. **YAGNI** - Don't build what you don't need
3. **Occam's Razor** - Simplest solution
4. **SOLID** - For complex systems
5. **DRY** - Eliminate duplication (not at cost of clarity)
6. **Miller's Law** - Respect 7±2 cognitive limit

## References

- [@~/.claude/rules/reference/SOLID.md]
- [@~/.claude/rules/reference/DRY.md]
- [@~/.claude/rules/reference/OCCAMS_RAZOR.md]
- [@~/.claude/rules/reference/MILLERS_LAW.md]
- [@~/.claude/rules/reference/YAGNI.md]
```

### 3.2 enhancing-progressively最適化後

```markdown
---
name: enhancing-progressively
description: CSS-first approach - use CSS before JavaScript
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Progressive Enhancement

## Purpose

Prefer CSS solutions over JavaScript. "The best code is no code."

## Decision Flow

Layout needed? → Grid/Flexbox (not JS)
Position change? → Transform (not top/left)
Show/Hide? → visibility/opacity (not display toggle)
State change? → :target/:checked/:has() (not JS state)
Responsive? → Media/Container queries (not resize listener)

## When JavaScript IS Required

- API data fetching
- Form submission/validation
- Complex multi-interaction state
- Dynamic content generation
- Browser APIs (localStorage, WebSocket)

## References

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md]
```

---

## 4. Test Scenarios

```typescript
describe('Skill Optimization', () => {
  it('[→] applying-code-principles reduced to ~50 lines', () => {
    // Given: Optimized SKILL.md
    // When: wc -l executed
    // Then: Line count <= 60
  });

  it('[→] skill keyword triggers still work', () => {
    // Given: User message containing "SOLID"
    // When: Skill activation checked
    // Then: applying-code-principles activates
  });

  it('[→] reference paths valid', () => {
    // Given: All reference paths in skills
    // When: File existence checked
    // Then: All referenced files exist
  });
});
```

---

## 5. Non-Functional Requirements

[→] NFR-001: トークン消費64%削減（2,041 → ~745行）
[→] NFR-002: スキルファイル構造標準化
[✓] NFR-003: スキル発動精度95%以上維持

---

## 6. Implementation Checklist

### Phase 1: 二重ロード解消 (即時)

- [ ] CLAUDE.mdバックアップ
- [ ] applying-code-principles埋め込み箇所特定
- [ ] 参照リンクに置換

### Phase 2: applying-code-principles (30分)

- [ ] 現ファイルバックアップ
- [ ] SOLID/DRY/YAGNI説明削除
- [ ] コード例削除
- [ ] Priority Order残す
- [ ] Reference paths残す
- [ ] 行数確認 (~50行)

### Phase 3-6: 他4スキル (各20-30分)

- [ ] creating-adrs → ~200行
- [ ] enhancing-progressively → ~120行
- [ ] applying-frontend-patterns → ~180行
- [ ] generating-tdd-tests → ~195行

### Phase 7: 検証 (30分)

- [ ] 全スキル発動テスト
- [ ] /code動作確認
- [ ] 最終行数集計

---

## 7. References

- SOW: `./sow.md`
- スキルディレクトリ: ~/.claude/skills/
- ルールディレクトリ: ~/.claude/rules/reference/
