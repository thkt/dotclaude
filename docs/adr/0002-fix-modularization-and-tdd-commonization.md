# ADR 0002: /fix Modularization and TDD Commonization

## Status

Accepted (2025-12-24)

## Implementation Progress

- [x] Phase 1: TDD基礎の共通化（skills + shared） - Completed
- [x] Phase 2: /fix のモジュール化（6モジュール） - Completed
- [x] Phase 3: /code の参照更新（機能維持） - Completed
- [x] Phase 4: テストと検証（動作確認） - Completed
- [x] Phase 5: ADR作成とドキュメント更新 - In Progress

## Context

### Problem 1: /fix Command Complexity

`/fix` command (`~/.claude/commands/fix.md`) was 239 lines with 10+ responsibilities, violating Miller's Law (7±2):

| # | Responsibility | Lines |
|---|----------------|-------|
| 1 | Dynamic Context | ~15 |
| 2 | Root Cause Analysis (Phase 1) | ~30 |
| 3 | Regression Test First (Phase 1.5) | ~45 |
| 4 | Implementation (Phase 2) | ~35 |
| 5 | Verification (Phase 3) | ~40 |
| 6 | Test Generation (Phase 3.5) | ~30 |
| 7 | Definition of Done | ~20 |
| 8 | Output Format | ~10 |
| 9 | Escalation | ~10 |
| 10 | Applied Principles | ~4 |

### Problem 2: DRY Violation (TDD Knowledge Duplication)

TDD fundamentals were duplicated across commands:

| Element | `/code/rgrc-cycle.md` | `/fix` Phase 1.5/3.5 | Duplication |
|---------|----------------------|---------------------|-------------|
| RGRC Cycle | 198 lines | Implicit | ~90% |
| Baby Steps | Detailed | Implied | ~60% |
| test-generator | Pattern 1 | Pattern 2 | ~70% |

### Issues

- **Miller's Law violation**: 10 responsibilities > 7±2 cognitive limit
- **DRY violation**: TDD knowledge duplicated
- **Maintainability**: Changes require updates in multiple places
- **Discoverability**: Hard to find TDD guidance
- **Consistency**: Risk of divergence between commands

## Decision Drivers

1. **Miller's Law (7±2)** - Reduce cognitive load
2. **DRY Principle** - Single source of truth for TDD knowledge
3. **Maintainability** - Easier to update and extend
4. **Reusability** - Share TDD fundamentals across commands
5. **User Experience** - Maintain `/code` and `/fix` functionality
6. **Consistency** - Follow ADR 0001 pattern

## Considered Options

### Option A: Status Quo (Do Nothing)

**Pros**:

- No implementation cost
- No risk of breaking changes
- No learning curve

**Cons**:

- Miller's Law violation continues
- DRY violation persists
- Maintenance burden grows
- Inconsistency risk increases

### Option B: Complete Integration

Merge `/code` and `/fix` TDD logic into single unified module.

**Pros**:

- Maximum DRY compliance
- Single source of truth
- Centralized maintenance

**Cons**:

- Context confusion (feature vs bug)
- Conditional logic complexity
- Readable Code violation
- Difficult to understand

### Option C: Hybrid Modularization (Chosen)

**Three-layer architecture**:

```text
Layer 1: Skills (Education)
  └─ skills/tdd-fundamentals/
     ├── SKILL.md (principles)
     └── examples/ (patterns)

Layer 2: Shared (Implementation)
  └─ commands/shared/
     ├── tdd-cycle.md (RGRC details)
     └── test-generation.md (patterns)

Layer 3: Commands (Execution)
  ├─ commands/fix.md + fix/ (6 modules)
  └─ commands/code/ (reference updates)
```

**Pros**:

- ✅ DRY for principles, context-specific for application
- ✅ Miller's Law compliant (6 modules < 7±2)
- ✅ Readable Code maintained (clear separation)
- ✅ Follows ADR 0001 pattern (consistency)
- ✅ Reusable across commands
- ✅ User experience unchanged

**Cons**:

- Implementation cost (5 phases)
- More files to navigate
- Reference management needed

## Decision Outcome

**Chosen Option**: Option C (Hybrid Modularization)

### Rationale

1. **DRY + Readable Balance**
   - Common principles → shared
   - Context-specific logic → separated
   - Best of both worlds

2. **Miller's Law Compliance**
   - `/fix`: 10 responsibilities → 6 modules (within 7±2)
   - Each module: 150-270 lines (readable size)

3. **Consistency with ADR 0001**
   - Same pattern as `/code` modularization
   - Proven approach
   - Familiar structure

4. **Future-proof**
   - Easy to add new commands
   - TDD fundamentals reusable
   - Extensible architecture

### Implementation Strategy

#### Phase 1: TDD基礎の共通化

Created **5 files**:

```text
skills/tdd-fundamentals/
├── SKILL.md (285 lines)
├── examples/
│   ├── feature-driven.md (75 lines)
│   └── bug-driven.md (80 lines)

commands/shared/
├── tdd-cycle.md (253 lines)
└── test-generation.md (228 lines)
```

**Content extracted**:

- TDD philosophy (t_wada, Kent Beck)
- Baby Steps principle and rhythm
- RGRC cycle implementation
- test-generator patterns

#### Phase 2: /fix のモジュール化

Created **7 files** (1 main + 6 modules):

```text
commands/
├── fix.md (164 lines) ← Thin wrapper
└── fix/
    ├── root-cause-analysis.md (153 lines)
    ├── regression-test.md (204 lines)
    ├── implementation.md (225 lines)
    ├── verification.md (248 lines)
    ├── test-generation.md (224 lines)
    └── completion.md (264 lines)
```

**Before vs After**:

- Lines: 239 → 164 (main file, 31% reduction)
- Responsibilities: 10 → 6 modules
- Miller's Law: ❌ Violated → ✅ Compliant

#### Phase 3: /code の参照更新

Updated **2 files** (non-destructive):

```text
commands/code/
├── rgrc-cycle.md (+ TDD Fundamentals Reference)
└── test-preparation.md (+ Test Generation Reference)
```

**Key principle**: Add references only, no logic changes.

**Result**: `/code` functionality 100% maintained.

#### Phase 4: テストと検証

**Verification results**:

- ✅ All files created (13 files)
- ✅ References valid (30 cross-references)
- ✅ Structure correct (3-layer architecture)
- ✅ `/code` functionality preserved

#### Phase 5: ADR作成とドキュメント更新

This document + COMMANDS.md updates.

## Consequences

### Positive

**Immediate**:

- ✅ Miller's Law compliant
- ✅ DRY principle applied
- ✅ Maintainability improved
- ✅ Reusability enabled

**Long-term**:

- ✅ Easy to add new commands (e.g., `/hotfix` modularization)
- ✅ TDD guidance centralized and discoverable
- ✅ Consistency across codebase
- ✅ Knowledge base for users

### Negative

**Immediate**:

- ⚠️ More files to navigate (13 new files)
- ⚠️ Learning curve for new structure
- ⚠️ Reference management overhead

**Long-term**:

- ⚠️ Risk of circular references (mitigation: careful design)
- ⚠️ Need to maintain EN/JA sync (existing issue)

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `/code` functionality broken | Low | High | Non-destructive updates, references only |
| Circular references | Medium | Medium | Clear hierarchy (Skills → Shared → Commands) |
| EN/JA drift | High | Low | Existing process, not new |
| User confusion | Low | Low | Clear structure, good documentation |

## Metrics

### Before

| Command | Main File | Responsibilities | Miller's Law |
|---------|-----------|------------------|--------------|
| `/code` | 89 lines | 4-5 | ✅ Compliant |
| `/fix` | 239 lines | 10+ | ❌ Violated |

### After

| Command | Main File | Modules | Total Lines | Miller's Law |
|---------|-----------|---------|-------------|--------------|
| `/code` | 89 lines | 6 | 807 lines | ✅ Compliant |
| `/fix` | 164 lines | 6 | 1,482 lines | ✅ Compliant |

**Key metrics**:

- `/fix` complexity reduction: 10 responsibilities → 6 modules
- DRY improvement: 3 sources of TDD knowledge → 1 (Skills + Shared)
- Reusability: 0 shared modules → 2 (tdd-cycle, test-generation)
- Cross-references: 0 → 30 (strong network)

## Integration Points

### With ADR 0001

This ADR follows the same pattern as ADR 0001:

- Thin wrapper pattern
- Module-based separation
- Reference-based integration
- Non-destructive updates

**Consistency**: Both `/code` and `/fix` now follow the same architecture.

### With Future Commands

This architecture enables:

- `/hotfix` modularization (if needed)
- New TDD-based commands
- Shared TDD fundamentals
- Consistent user experience

## References

- [ADR 0001](./0001-code-command-responsibility-separation.md) - `/code` modularization pattern
- [Miller's Law](../../rules/reference/MILLERS_LAW.md) - Cognitive load principle
- [DRY Principle](../../rules/reference/DRY.md) - Knowledge duplication
- [SOLID Principles](../../rules/reference/SOLID.md) - SRP application
- [COMMANDS.md](../COMMANDS.md) - Command documentation

## Future Considerations

### Potential Enhancements

1. **Japanese versions**: Create JA versions of new files
2. **`/hotfix` modularization**: Apply same pattern if complexity grows
3. **More shared modules**: Extract other common patterns (e.g., quality-gates)
4. **Skill auto-trigger**: Enable keyword-based TDD skill activation

### Review Criteria

Review this decision if:

- `/fix` or `/code` undergo major changes
- Miller's Law violated again (>7±2 modules)
- User feedback indicates confusion
- DRY violations reappear

---

*Created: 2025-12-24*
*Author: Claude Code*
*Status: Accepted*
