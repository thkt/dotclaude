# /fix Workflow - Bug Fix with Root Cause Analysis

Bug fix workflow using 5 Whys analysis and TDD regression testing.

## Workflow Overview

```text
Phase 1: Root Cause Analysis (5 Whys)
    ↓
Phase 1.5: Regression Test First (Red)
    ↓
Phase 2: Implementation (Green)
    ↓
Phase 3: Verification (Quality gates)
    ↓
Phase 3.5: Additional Tests (Optional)
    ↓
Completion: Report with confidence
```

## Phase 1: Root Cause Analysis

### Purpose

Apply 5 Whys methodology to find true cause, not just symptoms.

### Explore Agent Usage

```typescript
Task({
  subagent_type: "Explore",
  thoroughness: "quick",
  description: "Bug context exploration",
  prompt: `
    Bug: "${bugDescription}"
    Find: Related files, dependencies, recent commits
    Apply 5 Whys: Identify root cause, not just symptom
    Return: Findings with [✓/→/?] markers
  `,
});
```

### 5 Whys Questions

1. **Why did this happen?** - Immediate cause
2. **Why did that condition exist?** - What allowed this
3. **Why wasn't this caught?** - Process gap
4. **Why is this pattern here?** - Isolated or systematic
5. **Why do we do it this way?** - Design flaw?

### Analysis Output

```markdown
**Symptom**: [What user sees]
**Proximate cause**: [What failed directly]
**Root cause**: [Why it failed]
**Scope**: [Files affected]
**Pattern**: [Isolated/Pattern/Systematic]
**Confidence**: 0.XX
```

### When to Skip

- Trivial fixes (typos, obvious missing checks)
- High confidence (≥95%)
- Production hotfix with known cause

### When to Escalate

- Confidence <70% → `/research`
- Systematic issue → `/think` → `/code`
- Multiple components → complexity exceeds quick fix

## Phase 1.5: Regression Test First

### Purpose

Write failing test that reproduces the bug before fixing.

**TDD reference**: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)

### Process

1. Write test that reproduces bug exactly
2. Run test → Verify it FAILS
3. Confirm failure matches bug description

```typescript
it("when discount exceeds total, should return 0 not negative", () => {
  // Bug: returned -50 instead of 0
  const result = calculateTotal(100, 150);
  expect(result).toBe(0);
});
```

### Verification

- [x] Test **fails** (proves bug exists)
- [x] Failure reason matches bug
- [x] Error message is clear

If test passes immediately → test doesn't reproduce bug → revise.

### When to Skip

- Documentation-only changes
- Configuration updates
- Pure CSS/styling without logic
- Confidence > 0.95 AND trivial fix

## Phase 2: Implementation

### Confidence-Based Approach

| Confidence | Strategy      | Approach                 |
| ---------- | ------------- | ------------------------ |
| ≥90%       | Direct fix    | Straightforward solution |
| 70-89%     | Defensive fix | Add checks and guards    |
| <70%       | Escalate      | → /research or /think    |

### Apply Occam's Razor

```typescript
// Good: Simple
function calculateTotal(price, discount) {
  return Math.max(0, price - discount);
}

// Bad: Over-engineered
class PricingValidator {
  /* 50 lines */
}
```

### Don't Restructure Surrounding Code

Fix the bug only. Save refactoring for:

- Refactor phase of RGRC
- Separate PR

### CSS-First for UI Issues

Priority: CSS → HTML → JavaScript

## Phase 3: Verification

### Parallel Quality Checks

```bash
npm test -- --findRelatedTests &
npm run lint -- --fix &
npm run type-check &
wait
```

### Verification Checklist

- [x] Regression test passes (bug fixed)
- [x] All existing tests pass (no regressions)
- [x] Lint passes (0 errors)
- [x] Type check passes
- [x] Manual verification done

### When Verification Fails

| Issue                 | Action                        |
| --------------------- | ----------------------------- |
| Regression test fails | Revisit implementation        |
| Other tests fail      | Introduced regression, fix it |
| Lint errors           | Auto-fix or manual fix        |
| Type errors           | Fix types or implementation   |

## Phase 3.5: Additional Tests (Optional)

### When to Generate

- Bug was subtle/complex
- Multiple edge cases exist
- Similar bugs possible
- Critical business logic

**Pattern reference**: [@./shared/test-generation.md#pattern-2-bug-driven-bug-fixing](./shared/test-generation.md#pattern-2-bug-driven-bug-fixing)

### What to Generate

1. Main regression test (from Phase 1.5)
2. Edge cases around the fix
3. Integration tests if cross-component

## Completion

### /fix Specific Criteria

**Common criteria**: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)

- [x] Root cause identified (5 Whys applied)
- [x] Minimal complexity solution (Occam's Razor)
- [x] Quality gates passed
- [x] No regressions detected

### Output Format

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fix Summary

Problem: [User-facing description]
Root Cause: [Why it happened]
Confidence: 0.XX

Solution:

- Files: [modified files]
- Approach: [Direct/Defensive/CSS-first]
- Changes: [Brief description]

Verification:

- Tests: PASS XX/XX passing
- Lint: PASS No issues
- Types: PASS Valid

Status: COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Escalation Criteria

| Confidence | Phase          | Action                            |
| ---------- | -------------- | --------------------------------- |
| <50%       | Root Cause     | → /research immediately           |
| 50-69%     | Any            | → Ask user: continue or escalate? |
| 70-79%     | Implementation | Proceed with defensive approach   |
| ≥80%       | Any            | Proceed normally                  |

## Related

- TDD cycle: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)
- Test generation: [@./shared/test-generation.md](./shared/test-generation.md)
- Completion criteria: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)
