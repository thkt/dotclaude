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

`$ARGUMENTS`: Calling slash command's full argument string (e.g., `/fix "add login"` → `$ARGUMENTS = "add login"`).

Discovery steps.

1. Check `.claude/workspace/.current-sow` for tracked SOW path
2. If not found → `bfs .claude/workspace/planning -name 'sow.md'`
3. Select latest by directory name date (`YYYY-MM-DD-*`, newest first)
4. If 2+ SOWs share the same latest date → AskUserQuestion to select
5. If found → read SOW + corresponding `spec.md`
6. Extract. Acceptance Criteria, Implementation Plan, Constraints

Behavior by SOW state.

| State                  | Behavior                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| SOW + spec             | AC + Implementation Plan drive implementation                      |
| SOW only               | AC drives implementation, `$ARGUMENTS` fills implementation detail |
| No SOW                 | `$ARGUMENTS` is sole instruction                                   |
| `$ARGUMENTS` conflicts | SOW wins; flag conflict to user via AskUserQuestion                |

If SOW exists, update status `draft` or `completed` → `in-progress`.

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
