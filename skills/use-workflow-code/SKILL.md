---
name: use-workflow-code
description: Workflow orchestration for /code.
when_to_use: /code ワークフロー, quality gates, 品質ゲート, RGRC サイクル
allowed-tools: Read Write Grep Glob Task Bash(npm:*) Bash(npx:*) Bash(tsc:*) Bash(bun:*)
user-invocable: false
---

# Workflow: /code

## Workflows

| Command | Workflow Reference                              |
| ------- | ----------------------------------------------- |
| `/code` | ${CLAUDE_SKILL_DIR}/references/code-workflow.md |

## Patterns

| Pattern        | Reference                                                   |
| -------------- | ----------------------------------------------------------- |
| IDR Generation | ${CLAUDE_SKILL_DIR}/../../hooks/lifecycle/idr-pre-commit.sh |
| TDD            | ${CLAUDE_SKILL_DIR}/../use-workflow-tdd-cycle/SKILL.md      |

<!-- canonical: rules/development/THRESHOLDS.md (coverage targets) -->

## Quality Gates

| Gate         | Target                | Verification                       |
| ------------ | --------------------- | ---------------------------------- |
| Tests        | All passing           | `npm test` exit code 0             |
| Lint         | 0 errors              | `npm run lint` exit code 0         |
| Types        | No errors             | `tsc --noEmit` exit code 0         |
| Coverage     | C0 ≥90%, C1 ≥80%      | Coverage report                    |
| Test Quality | per-metric thresholds | `evaluator-test` (skip if no Spec) |

### Test Quality Gate

When a Spec with Test Scenarios exists, spawn `evaluator-test` as a background agent using this invocation.

```
Agent(subagent_type: "evaluator-test",
      prompt: "spec_path: <path>\ntest_paths: <paths>",
      run_in_background: true)
```

Pass when all 5 metrics meet thresholds. On any fail, report findings (uncovered T-NNN, excess tests, duplicates, granularity issues, intent issues) and fix before proceeding. Skip when no Spec exists (e.g., `/fix`, ad-hoc changes).

| Metric      | Threshold |
| ----------- | --------- |
| coverage    | ≥0.8      |
| excess      | ≤0.1      |
| duplication | ≤0.2      |
| granularity | ≥0.7      |
| intent      | ≥0.7      |

### Review Gate

After RGRC cycles, spawn `reviewer-readability` as a background agent:

```
Agent(subagent_type: "reviewer-readability",
      prompt: "Review files changed in this session: <paths>",
      run_in_background: true)
```

High severity → fix before Quality Gates. Medium/low → advisory (note in IDR).
Skip for `/fix` and single-file changes.

### Gate Result Output

```text
Tests:        pass | fail (detail)
Lint:         pass | fail (detail)
Types:        pass | fail (detail)
Coverage:     C0 XX% / C1 XX% - pass | fail
Test Quality: cov=X.X exc=X.X dup=X.X gran=X.X int=X.X | pass | fail | skip (no Spec)
```

All 5 lines required. Empty lines indicate a skipped gate - investigate before
proceeding.

## Rationalization Counters

| Excuse                                   | Counter                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| "Tests pass, lint can wait"              | Lint errors are tech debt. Zero errors before commit           |
| "Type errors are just warnings"          | `tsc --noEmit` exit 0 or no ship. Type warnings are errors     |
| "Coverage is close enough"               | "Close enough" is failure with extra steps. Meet the threshold |
| "This gate doesn't apply to this change" | All 4 gates apply to every change. No exceptions               |
