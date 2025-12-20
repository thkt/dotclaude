# ADR 0001: code.md コマンドの責任分離

## Status

Accepted (2025-12-16)

## Implementation Progress

- [x] Phase 1: Validation - commands/code/ directory created
- [x] Phase 2: High-Priority Separation - test-preparation.md, storybook.md extracted
- [x] Phase 3: Complete Separation - rgrc-cycle.md, quality-gates.md, completion.md extracted
- [x] Phase 4: Documentation Update - COMMANDS.md, Japanese sync completed (2025-12-16)

### Implementation Note

`principles.md` was not created as a separate file. Instead, existing skills are referenced:

- `@~/.claude/skills/applying-code-principles/SKILL.md`
- `@~/.claude/skills/generating-tdd-tests/SKILL.md`

This decision follows DRY principle by reusing existing assets rather than duplicating content.

## Context

`/code` コマンド（`~/.claude/commands/code.md`）は現在906行、10以上の責任を持ち、Miller's Law（7±2）に違反している。

### 現状の責任（調査結果）

| # | 責任 | 行数 | セクション |
|---|------|------|-----------|
| 1 | spec.md 管理 | 26 | Specification Context |
| 2 | Storybook 統合 | 73 | Storybook Integration |
| 3 | スキル参照 | 10 | Integration with Skills |
| 4 | 実装原則説明 | 305 | Implementation Principles |
| 5 | テスト準備 | 143 | Test Preparation (Phase 0) |
| 6 | RGRC サイクル | 120 | TDD Cycle |
| 7 | 進捗表示 | 89 | Progress Display |
| 8 | 品質チェック | 56 | Quality Check Results |
| 9 | リスク軽減 | 34 | Risk Mitigation |
| 10 | 完了定義 | 53 | Definition of Done |

### 問題点

- **Miller's Law 違反**: 10+の責任は認知限界（7±2）を超過
- **保守性低下**: 変更時の影響範囲が広い
- **テスト困難**: 単一ファイルで複数の機能をテストする必要
- **理解困難**: 新規開発者が全体像を把握しにくい

## Decision Drivers

1. **単一責任原則（SRP）への準拠** - 各コマンドは一つの責任のみを持つべき
2. **Miller's Law（7±2）の遵守** - 認知負荷を軽減
3. **保守性の向上** - 変更の影響範囲を限定
4. **テスト可能性の向上** - 個別機能のテストを容易に
5. **ユーザー体験の維持** - 既存のワークフローを破壊しない

## Considered Options

### Option A: 現状維持（一枚岩）

**説明**: 変更なし、現在の構造を維持

**Pros**:

- 変更コストゼロ
- 既存の動作を破壊しない
- 学習コストなし

**Cons**:

- Miller's Law 違反が継続
- 保守性が低下し続ける
- 新機能追加がさらに複雑化
- テスト困難

### Option B: フェーズ別分離

**説明**: `/code-test`, `/code-impl`, `/code-quality` に分離

```text
/code → /code-test → /code-impl → /code-quality
```

**Pros**:

- 各コマンドが単一責任
- 独立してテスト可能
- 段階的な実行が可能

**Cons**:

- ユーザーの学習コスト増加
- コマンド間の連携が必要
- 既存ワークフローの破壊
- 3つのコマンドを覚える必要

### Option C: インクルード方式（推奨）

**説明**: 共通部分を外部ファイルに切り出し、code.md から参照

```text
~/.claude/commands/
├── code.md                    # メインコマンド（薄いラッパー）
└── code/
    ├── spec-context.md        # spec.md 管理
    ├── storybook.md           # Storybook 統合
    ├── principles.md          # 実装原則
    ├── test-preparation.md    # テスト準備
    ├── rgrc-cycle.md          # RGRC サイクル
    └── quality-gates.md       # 品質チェック
```

**Pros**:

- ユーザー体験は変わらない（`/code` のまま）
- 内部構造のみ改善
- 段階的な移行が可能
- 各ファイルが単一責任

**Cons**:

- 参照解決の複雑さ
- 現在の Claude Code がインクルードをサポートしているか要確認
- デバッグ時に複数ファイルを追う必要

## Decision Outcome

**Chosen Option**: Option C（インクルード方式）

### Rationale

1. **ユーザー体験の維持**: 既存のワークフロー（`/code`）を変更せずに内部改善
2. **段階的移行**: 一度にすべてを分離せず、優先度の高い部分から移行可能
3. **互換性**: 既存の SOW/Spec との連携を維持
4. **YAGNI 適用**: 分離が必要な部分のみ実施、過度な抽象化を回避

### 実装上の注意

- インクルード方式が技術的に実現可能か検証が必要
- 実現不可能な場合は Option A（現状維持）にフォールバック
- 将来的に Claude Code がモジュール機能をサポートした場合に再評価

## Technical Investigation Results

### Investigation Date: 2025-12-16

#### Method 1: Skill-based Modularization

**Approach**: Create dedicated skills for each responsibility area.

```text
~/.claude/skills/
├── tdd-test-generation/    # Already exists, reused
├── code-principles/        # Already exists, reused
├── code-spec-context/      # NEW: spec.md management
├── code-quality-gates/     # NEW: Quality checks
└── code-rgrc-cycle/        # NEW: TDD cycle orchestration
```

**Pros**:

- Skills auto-trigger on keywords
- Reusable across multiple commands
- Native Claude Code feature
- Matches existing pattern (code.md already references 4 skills)

**Cons**:

- Skills designed for knowledge/guides, not orchestration
- Over-abstraction risk (skills for single-use content)
- Scattered maintenance across skill directories

#### Method 2: @-Reference Include Approach

**Approach**: Split code.md into focused files using @-references.

```text
~/.claude/commands/
├── code.md                 # Thin wrapper (orchestration only)
└── code/
    ├── spec-context.md     # spec.md management
    ├── storybook.md        # Storybook integration
    ├── test-preparation.md # Phase 0 test generation
    ├── rgrc-cycle.md       # TDD cycle details
    ├── quality-gates.md    # Quality checks
    └── completion.md       # Definition of Done
```

**Pros**:

- Maintains command structure
- Files focus on single responsibility
- Centralized under `/commands/code/`
- No change to user experience

**Cons**:

- @-references require manual file reads
- Not a native "include" directive
- References are context hints, not automatic inclusion

#### Current Pattern Analysis

code.md already uses hybrid approach:

- **Knowledge content** → Skills (`[@~/.claude/skills/generating-tdd-tests/SKILL.md]`)
- **Rule references** → Rules (`[@~/.claude/rules/development/TDD_RGRC.md]`)

#### Recommended Hybrid Approach

| Content Type | Modularization Method | Rationale |
|--------------|----------------------|-----------|
| **Knowledge/Principles** | Skills (existing) | Reusable, auto-triggered |
| **Orchestration/Process** | @-references to commands/code/ | Command-specific |
| **Templates/Formats** | Inline in sub-files | Single use |

**Implementation Strategy**:

1. **Keep existing skill references** for tdd-test-generation, code-principles, frontend-patterns
2. **Extract large sections** (Phase 0, Progress Display) to commands/code/
3. **code.md becomes thin wrapper** (~200 lines) that:
   - Defines purpose and usage
   - References skills for knowledge
   - References sub-files for process details
   - Handles overall orchestration

#### Estimated Impact

| Metric | Current | After Split |
|--------|---------|-------------|
| code.md lines | 905 | ~200 |
| Responsibilities in main file | 10+ | 4-5 |
| Sub-files | 0 | 5-6 |
| Miller's Law compliance | ❌ | ✅ |

## Implementation Roadmap

### Phase 1: Validation (1 week)

1. Create commands/code/ directory
2. Extract spec-context.md (low risk)
3. Test @-reference behavior
4. Verify functionality

### Phase 2: High-Priority Separation (2 weeks)

1. Extract test-preparation.md (Phase 0)
2. Extract progress-display.md
3. Validate and test

### Phase 3: Complete Separation (2 weeks)

1. Extract rgrc-cycle.md
2. Extract quality-gates.md
3. Extract completion.md
4. Refactor code.md as thin wrapper

### Phase 4: Documentation Update (1 week)

1. Update COMMANDS.md
2. Sync Japanese version
3. Update test strategy

## Consequences

### Positive

- コードの保守性向上
- 各責任の独立したテストが可能
- 新機能追加が容易
- 認知負荷の軽減

### Negative

- 初期の実装コスト
- ファイル数の増加
- デバッグ時の複雑さ増加（一時的）

### Risks

- インクルード方式が技術的に実現不可能な場合
  - 軽減策: Option A にフォールバック
- 移行中の既存機能の破壊
  - 軽減策: 段階的移行、各フェーズでテスト

## References

- [Zenn記事: Spec駆動開発におけるコンテキストエンジニアリング](https://zenn.dev/kiokisun/articles/cb5ac3d50145ac)
- [調査結果](../../workspace/planning/2025-12-16-workflow-improvement/)
- [Miller's Law](../../rules/reference/MILLERS_LAW.md)
- [SOLID Principles](../../rules/reference/SOLID.md)

---

*Created: 2025-12-16*
*Author: Claude Code*
