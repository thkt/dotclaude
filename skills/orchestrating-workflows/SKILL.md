---
name: orchestrating-workflows
description: >
  Command workflow orchestration patterns for /code, /fix, /audit, and other implementation commands.
  Provides step-by-step execution flows, quality gates, and completion criteria.
  Triggers: workflow, orchestration, command flow, IDR, test generation, RGRC, quality gates, completion criteria.
allowed-tools: Read, Write, Grep, Glob, Task, Bash
user-invocable: false
---

# Orchestrating Workflows

Command workflow patterns and orchestration logic for implementation commands.

## Purpose

Centralize workflow knowledge that was previously scattered across `references/commands/`.
Commands become thin orchestrators that reference this skill for execution logic.

## Workflow Types

### Implementation Workflows

| Command | Workflow Reference                                              | Purpose                            |
| ------- | --------------------------------------------------------------- | ---------------------------------- |
| `/code` | [@./references/code-workflow.md](./references/code-workflow.md) | TDD implementation with RGRC cycle |
| `/fix`  | [@./references/fix-workflow.md](./references/fix-workflow.md)   | Bug fix with root cause analysis   |

### Shared Patterns

| Pattern         | Reference                                                                         | Used By                           |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------- |
| IDR Generation  | [@./references/shared/idr-generation.md](./references/shared/idr-generation.md)   | /code, /audit, /polish, /validate |
| TDD Cycle       | [@./references/shared/tdd-cycle.md](./references/shared/tdd-cycle.md)             | /code, /fix                       |
| Test Generation | [@./references/shared/test-generation.md](./references/shared/test-generation.md) | /code, /fix                       |

## Quick Reference

### RGRC Cycle (Red-Green-Refactor-Commit)

```text
1. Red    - Write failing test (verify failure reason)
2. Green  - Minimal code to pass ("You can sin" - quick/dirty OK)
3. Refactor - Apply principles (keep tests green)
4. Commit - Save stable state
```

### Quality Gates

| Gate     | Target           | Verification               |
| -------- | ---------------- | -------------------------- |
| Tests    | All passing      | `npm test` exit code 0     |
| Lint     | 0 errors         | `npm run lint` exit code 0 |
| Types    | No errors        | `tsc --noEmit` exit code 0 |
| Coverage | C0 ≥90%, C1 ≥80% | Coverage report            |

### Completion Criteria

| Check                 | Status              |
| --------------------- | ------------------- |
| All tests passing     | Required            |
| No lint errors        | Required            |
| No type errors        | Required            |
| Documentation updated | If behavior changed |
| IDR generated         | If SOW exists       |

## References

### Principles (rules/)

- [@../../rules/development/COMPLETION_CRITERIA.md](../../rules/development/COMPLETION_CRITERIA.md) - Confidence metrics
- [@../../rules/development/PROGRESSIVE_ENHANCEMENT.md](../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - Outcome-first development

### Related Skills

- `generating-tdd-tests` - TDD fundamentals
- `applying-code-principles` - Design principles

### Used by Commands

- `/code` - TDD implementation
- `/fix` - Bug fixes
- `/audit` - Code review
- `/polish` - Code simplification
- `/validate` - SOW validation
