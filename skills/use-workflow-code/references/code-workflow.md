# /code Workflow

## Flow

```text
Phase 0: SOW Context + Test Generation
Phase 1-N: RGRC (one test at a time)
  Red → Green (gates auto-retry) → Refactor → Commit
Review: reviewer-readability (skip for /fix)
E2E: generator-e2e (conditional. Spec has Type: e2e + agent-browser + dev server)
Completion: Quality Gates
```

## Phase 0: SOW Context + Test Generation

### SOW/Spec Auto-detection

See ${CLAUDE_SKILL_DIR}/../\_lib/sow-resolution.md

### Test Generation

Prerequisites. spec.md with FR-xxx items.

1. Parse FR-xxx requirements from spec
2. Generate all tests in skip state
3. Order. simple → complex (Baby Steps)
4. Add `// T-NNN` comment to each test mapping to Spec Test Scenario ID

T-NNN traceability. Each `it()` block includes a comment referencing its Spec test scenario (e.g., `// T-001`). This keeps verification in living code and enables `evaluator-test` to compute coverage and other quality metrics.

## Phase 1-N: RGRC Cycle

For each test.

| Step     | Action                                            |
| -------- | ------------------------------------------------- |
| Red      | Remove `.skip`, verify correct failure            |
| Green    | Implement minimal (gates auto-retry on Stop hook) |
| Refactor | Apply SOLID, DRY, Occam                           |
| Commit   | All checks pass                                   |

## Review Gate

After all RGRC cycles, spawn `reviewer-readability` to catch structural and readability issues missed during implementation.

```text
Agent(subagent_type: "reviewer-readability",
      prompt: "Review files changed in this session: <changed file paths>",
      run_in_background: true)
```

| Result           | Action                             |
| ---------------- | ---------------------------------- |
| 0 high findings  | Pass → proceed to Quality Gates    |
| ≥1 high findings | Fix issues → re-run affected tests |
| medium/low only  | Pass                               |
| timeout          | Skip                               |

Skip when `/fix`, single-file changes, or no Spec context.

## E2E Phase

After Review Gate, conditionally spawn `generator-e2e`. See the E2E Phase section in ${CLAUDE_SKILL_DIR}/../code/SKILL.md for full conditions and dev server detection logic.

Skip when no `Type: e2e` in Spec, agent-browser not installed, no dev server, or `/fix`.

## Quality Gates

Run lint, type-check, test using project's package manager (detect from lockfile). Independent commands in parallel.

## Implementation Approach

| Situation                                          | Action               |
| -------------------------------------------------- | -------------------- |
| Matches known pattern in codebase (cite file:line) | Proceed              |
| Partial match, some unknowns remain                | Add defensive checks |
| Unknown territory, no precedent in codebase        | → /research first    |
