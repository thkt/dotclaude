# Auto-Test Workflow

Automated test runner with conditional fix on failure.

## Flow

```text
/auto-test
    │
    ├─ Discover test command
    │
    ├─ Run tests
    │
    ├─ If failures:
    │     ├─ Analyze error
    │     ├─ Apply /fix
    │     └─ Re-run tests
    │
    └─ Repeat until green or max iterations
```

## Test Discovery Priority

1. Read `README.md` → Scripts section
2. Check `package.json` → scripts
3. Search for test files (`*.test.*`, `*.spec.*`)
4. Ask user if not found

## Common Test Commands

| Package Manager | Command      |
| --------------- | ------------ |
| npm             | `npm test`   |
| yarn            | `yarn test`  |
| pnpm            | `pnpm test`  |
| vitest          | `npx vitest` |
| jest            | `npx jest`   |

## Auto-Fix Integration

When tests fail:

```text
1. Parse error output
2. Identify failing test(s)
3. Invoke /fix with error context
4. Re-run tests
5. Repeat if still failing (up to max iterations)
```

## Configuration

```yaml
max_iterations: 5
timeout_per_run: 120000 # 2 minutes
stop_on_success: true
```

## Progress Display

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auto-Test Progress

Iteration 1/5:
├─ Run tests...
├─ 3 failed, 42 passed
├─ Analyzing failures...
├─ Fixing: auth.test.ts
└─ Re-running...

Iteration 2/5:
├─ Run tests...
└─ All 45 tests passed ✅

Status: COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Exit Conditions

| Condition      | Action                       |
| -------------- | ---------------------------- |
| All tests pass | Exit with success            |
| Max iterations | Exit with remaining failures |
| Critical error | Exit immediately             |
| User interrupt | Exit gracefully              |

## Integration with RGRC

```text
/code (RGRC cycle)
    │
    ├── Red: Write failing test
    ├── Green: Minimal implementation
    ├── Refactor: Apply principles
    └── Commit: Save state

/auto-test (automated iteration)
    │
    ├── Run tests
    ├── Fix failures (via /fix)
    └── Repeat until green
```

## Related

- Fix workflow: [@../../orchestrating-workflows/references/fix-workflow.md](../../orchestrating-workflows/references/fix-workflow.md)
- TDD cycle: [@../../orchestrating-workflows/references/shared/tdd-cycle.md](../../orchestrating-workflows/references/shared/tdd-cycle.md)
