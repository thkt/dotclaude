# /code Workflow - TDD Feature Development

Feature implementation workflow using TDD/RGRC cycle with spec-driven test generation.

## Workflow Overview

```text
Phase 0: Test Preparation (spec.md → skipped tests)
    ↓
Phase 1-N: RGRC Cycle (one test at a time)
    ├─ Red: Activate test, verify failure
    ├─ Green: Minimal implementation (Ralph-loop)
    ├─ Refactor: Apply principles
    └─ Commit: Save state
    ↓
Completion: Quality gates → IDR generation
```

## Phase 0: Specification Context

### Auto-Detect Spec

```text
Search locations:
- .claude/workspace/planning/**/spec.md
- ~/.claude/workspace/planning/**/spec.md

If found:
- Parse FR-xxx requirements
- Extract Given-When-Then scenarios
- Use as implementation guide

If not found:
- Consider running /think first
- Document assumptions inline
```

### Test Generation (Skip Mode)

Generate test scaffold with ALL tests in skip state.

**Pattern reference**: [@./shared/test-generation.md#pattern-1-spec-driven-feature-development](./shared/test-generation.md#pattern-1-spec-driven-feature-development)

### Test Queue Display

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Queue (Baby Steps Order)

| #   | Test Name             | Status | From   |
| --- | --------------------- | ------ | ------ |
| 1   | handles zero input    | SKIP   | FR-001 |
| 2   | calculates basic case | SKIP   | FR-002 |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Phase 1-N: RGRC Cycle

**Full TDD reference**: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)

### Interactive Activation

For each test, prompt user:

```text
[Y] Activate and enter Red phase
[S] Skip to next test
[Q] Quit test generation
```

### Red Phase

1. Remove `.skip` marker
2. Run test → Verify it fails for correct reason
3. Confirm failure message matches intent

### Green Phase (Ralph-loop Auto-iteration)

```text
1. Confirm test failure
2. Ralph-loop auto-activates
3. Implement → Run → Retry if failed
4. Output <promise>GREEN</promise> when pass
5. Transition to Refactor
```

**Completion**: All tests pass OR max iterations reached.

### Refactor Phase

Apply principles while keeping tests green:

- SOLID for structure
- DRY for duplication
- Occam's Razor for simplicity

### Commit Phase

All checks must pass before commit.

## Quality Gates

### Parallel Execution

```bash
npm run lint &
npm run type-check &
npm test -- --findRelatedTests &
wait
```

### Gate Thresholds

| Check    | Target           | Action      |
| -------- | ---------------- | ----------- |
| Tests    | All pass         | Required    |
| Lint     | 0 errors         | Required    |
| Types    | No errors        | Required    |
| Coverage | C0 ≥90%, C1 ≥80% | Recommended |

### Progress Display

```text
├─ Tests      [████████████] PASS 45/45
├─ Coverage   [████████░░░░] WARN 78%
├─ Lint       [████████████] PASS 0 errors
└─ TypeCheck  [████████████] PASS
```

## Storybook Integration (Optional)

### Trigger Condition

- spec.md contains `### 4.x Component API:` section

### Process

1. Parse ComponentSpec from spec
2. Check existing Stories file
3. Options: Overwrite / Skip / Merge / Diff only
4. Generate CSF3 format Stories

## Completion Criteria

**Common criteria**: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)

### /code Specific

- [x] All RGRC cycles complete
- [x] Feature works as specified
- [x] Edge cases handled
- [x] Quality gates passed

### Confidence-Based Decisions

| Confidence | Action                      |
| ---------- | --------------------------- |
| ≥80%       | Proceed with implementation |
| 50-79%     | Add defensive checks        |
| <50%       | → /research first           |

## IDR Generation

After implementation, generate IDR.

**Full logic**: [@./shared/idr-generation.md](./shared/idr-generation.md)

## Related

- TDD cycle: [@./shared/tdd-cycle.md](./shared/tdd-cycle.md)
- Test generation: [@./shared/test-generation.md](./shared/test-generation.md)
- IDR generation: [@./shared/idr-generation.md](./shared/idr-generation.md)
- Completion criteria: [@../../../rules/development/COMPLETION_CRITERIA.md](../../../rules/development/COMPLETION_CRITERIA.md)
