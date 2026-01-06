---
description: Rapidly fix small bugs and minor improvements in development environment
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: inherit
argument-hint: "[bug or issue description]"
dependencies: [Explore, test-generator, generating-tdd-tests]
---

# /fix - Quick Bug Fix

## Purpose

Rapidly fix small bugs with root cause analysis and confidence-based verification.

## When to Use

| Use `/fix`                   | Use other command                |
| ---------------------------- | -------------------------------- |
| Small, well-understood issue | Unknown root cause → `/research` |
| Single file or 2-3 files     | Multi-file refactoring → `/code` |
| Confidence ≥80%              | New feature → `/think`           |

## Fix Process Overview

The `/fix` command follows a structured 6-phase approach:

```text
Phase 1: Root Cause Analysis
  ↓ Identify true cause, not symptom
Phase 1.5: Regression Test First (Recommended)
  ↓ Write failing test (TDD approach)
Phase 2: Implementation
  ↓ Confidence-based fix
Phase 3: Verification
  ↓ Quality checks
Phase 3.5: Test Generation (Optional)
  ↓ Additional regression tests
Definition of Done
  ↓ Output & learnings
```

## Process Modules

Each phase has detailed guidance in dedicated modules:

### Phase 1: Root Cause Analysis

[@../references/commands/fix/root-cause-analysis.md](~/.claude/references/commands/fix/root-cause-analysis.md)

- Dynamic context (git diff, test status)
- Explore agent for 5 Whys
- Pattern recognition (isolated/pattern/systematic)
- Confidence markers ([✓/→/?])

**Output**: Root cause identified with confidence score

### Phase 1.5: Regression Test First (Recommended)

[@../references/commands/fix/regression-test.md](~/.claude/references/commands/fix/regression-test.md)

- TDD approach to bug fixes
- Write failing test that reproduces bug
- Verify correct failure
- References: [@../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md)

**When to skip**:

- Documentation-only changes
- Configuration changes
- UI-only fixes without logic
- Confidence > 0.95 and trivial fix

**Output**: Failing test that reproduces bug

### Phase 2: Implementation

[@../references/commands/fix/implementation.md](~/.claude/references/commands/fix/implementation.md)

- Confidence-based approach:
  - High (>0.9): Direct fix
  - Medium (0.7-0.9): Defensive fix
  - Low (<0.7): Escalate to `/research`
- Apply Occam's Razor (simplest solution)
- CSS-first for UI issues
- Don't restructure surrounding code

**Output**: Minimal fix applied

### Phase 3: Verification

[@../references/commands/fix/verification.md](~/.claude/references/commands/fix/verification.md)

- Run quality checks in parallel:
  - Tests (regression + all)
  - Lint (auto-fix)
  - Type check
- Manual spot check
- No regressions detected

**Output**: All checks passing

### Phase 3.5: Test Generation (Optional)

[@../references/commands/fix/test-generation.md](~/.claude/references/commands/fix/test-generation.md)

- Use test-generator for edge cases
- References: [@../references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md)
- Integration tests if needed

**When to skip**:

- Non-testable changes
- Comprehensive tests already exist

**Output**: Additional regression tests

### Definition of Done

[@../references/commands/fix/completion.md](~/.claude/references/commands/fix/completion.md)

- Completion criteria
- Output formatting
- Escalation guidelines
- Applied principles documentation

**Confidence target**: ≥0.9

## Confidence Markers

Use throughout all outputs:

- **[✓]** High (>0.8) - Directly verified from code/files
- **[→]** Medium (0.5-0.8) - Reasonable inference from evidence
- **[?]** Low (<0.5) - Assumption requiring verification

## Escalation

If confidence drops below 0.7 at any phase:

```text
⚠️ Low Confidence - Recommend escalation:
- /research - Investigate deeper
- /think - Plan comprehensive solution
- /code - Implement with full TDD
```

## IDR (Intentionally Skipped)

`/fix` does **NOT** generate IDR because:

- Small bug fixes don't need extensive decision documentation
- IDR is designed for complex features with SOW tracking
- Quick iteration is prioritized over documentation overhead

**When to use IDR**: Use `/code` for features requiring decision tracking.

## Applied Principles

- **Occam's Razor**: Simplest solution that works
- **TIDYINGS**: Clean only what you touch
- **Progressive Enhancement**: CSS-first for UI issues
- **TDD**: Test-first for bug fixes

## Next Steps After Fix

- **Success**: Document learnings, commit changes
- **Partial**: Follow-up `/fix` or `/research`
- **Escalation**: `/think` → `/code` for comprehensive solution

## Integration with TDD

For TDD fundamentals and patterns:

- [@../skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD philosophy
- [@../skills/generating-tdd-tests/references/bug-driven.md](~/.claude/skills/generating-tdd-tests/references/bug-driven.md) - Bug-driven TDD pattern
- [@../references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC cycle details
