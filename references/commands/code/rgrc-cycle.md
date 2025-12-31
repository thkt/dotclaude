# TDD/RGRC Cycle Implementation Details

This module provides detailed TDD implementation guidance for feature development with spec-driven approach.

## TDD Fundamentals Reference

For core TDD principles, Baby Steps, and RGRC cycle basics:

- [@~/.claude/skills/generating-tdd-tests/SKILL.md](~/.claude/skills/generating-tdd-tests/SKILL.md) - TDD philosophy and principles
- [@~/.claude/skills/generating-tdd-tests/references/feature-driven.md](~/.claude/skills/generating-tdd-tests/references/feature-driven.md) - Feature-driven TDD pattern
- [@~/.claude/references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md) - RGRC implementation details

## Feature-Driven TDD Context

This module focuses on **spec-driven feature development** with interactive test activation.

**Key Characteristics**:

- Tests generated from spec.md (Phase 0)
- All tests start in skip state
- User activates one test at a time
- Full RGRC cycle for each test

**See also**: [@./test-preparation.md](./test-preparation.md) for Phase 0 details

### Test Generation from Plan (Pre-Red)

Before entering the RGRC cycle, automatically generate tests from spec.md.

**For detailed test generation patterns**:
[@~/.claude/references/commands/shared/test-generation.md](~/.claude/references/commands/shared/test-generation.md)

**Spec-driven generation** (Phase 0):
See [@./test-preparation.md](./test-preparation.md) for interactive test activation workflow.

**Quick reference**:

```bash
# 1. Check for spec with test scenarios
.claude/workspace/planning/[feature-name]/spec.md

# 2. Generate tests in skip mode (Phase 0)
# See test-preparation.md for details

# 3. Activate one test at a time (interactive)
```

**When to generate:**

- spec.md contains FR-xxx requirements or Given-When-Then scenarios
- No existing tests for planned features
- User requests test generation

**Skip conditions:**

- Tests already exist
- No spec.md defined
- Quick fix mode (use `/fix` instead)

### Enhanced RGRC Cycle with Real-time Feedback

For detailed phase guidance (Red/Green/Refactor/Commit steps, exit criteria, timing):
[@~/.claude/references/commands/shared/tdd-cycle.md](~/.claude/references/commands/shared/tdd-cycle.md)

**Feature-specific adaptations**:

| Phase | Feature Context |
| --- | --- |
| Red | Use generated tests from spec.md, or write new |
| Green | **Ralph-loop auto-iteration** until tests pass |
| Refactor | Apply SOLID, extract patterns |
| Commit | User executes git commands |

## Ralph-loop Integration (Green Phase)

During Green Phase, automatic iterative implementation runs until tests pass.

### Auto-iteration Mechanism

```markdown
1. Confirm test failure (Red Phase complete)
2. Ralph-loop auto-activates
3. Implement → Run tests → Retry if failed
4. Output <promise>GREEN</promise> when all tests pass
5. Transition to Refactor Phase
```

### Internal Behavior

```bash
# During /code command execution, Green Phase auto-runs:
/ralph-loop "
Implement minimal code to pass current tests.
Output <promise>GREEN</promise> when all tests pass.
" --completion-promise "GREEN" --max-iterations 10
```

### Completion Conditions

| Condition | Action |
| --- | --- |
| All tests pass | Output `<promise>GREEN</promise>` and exit |
| Max iterations reached | Stop and report to user |
| Critical error | Immediate stop, request manual intervention |

### Baby Steps Integration

Ralph-loop attempts **minimal changes** in each iteration:

- Pass one test at a time
- Learn from past failures (reference file history)
- Split complex implementations into stages

## Progress Display

### RGRC Cycle Progress Visualization

Display TDD cycle progress with real-time updates:

```markdown
Implementation Task: User Authentication Feature
Red -> Green -> Refactor -> Commit

Current Cycle: Scenario 2/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Red Phase    [████████████] Complete
Green Phase  [████████░░░░] 70%
Refactor     [░░░░░░░░░░░░] Waiting
Commit       [░░░░░░░░░░░░] Waiting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current: Minimal implementation until test passes...
Elapsed: 8 min | Remaining scenarios: 3
```

### Implementation Mode Indicators

#### TDD Mode (Default)

```markdown
TDD Progress:
Cycle 3/8: Green Phase
[ACTIVE] Current test: should handle edge cases
Lines written: 125 | Tests: 18/20
```

#### Quick Implementation Mode

```markdown
[FAST] Quick implementation... [████████░░] 80%
Skipping some quality checks for speed
```

## TodoWrite Integration

Real-time tracking with confidence scoring:

```markdown
# Implementation: [Feature Name]
## Scenarios (Total Confidence: 0.85)
1. [PENDING] User registration with valid email [C: 0.9]
2. [PENDING] Registration fails with invalid email [C: 0.8]
3. [PENDING] Duplicate email prevention [C: 0.85]

## Current RGRC Cycle - Scenario 1
### Red Phase (Started: 14:23)
1.1 [DONE] Write failing test [C: 0.95] 2 min
1.2 [DONE] Verify correct failure [C: 0.9] 30 sec

### Green Phase (Active: 14:26)
1.3 [FAIL] Implement registration logic [C: 0.7] 3 min
1.4 [PENDING] Test passes consistently [C: pending]

### Refactor Phase (Pending)
1.5 [PENDING] Apply SOLID principles [C: pending]
1.6 [PENDING] Extract validation logic [C: pending]

### Quality Gates
- Tests: 12/14 passing
- Coverage: 78% (target: 80%)
- Lint: 2 warnings
- Types: All passing
```
