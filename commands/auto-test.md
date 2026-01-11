---
description: Automatically execute tests and invoke /fix if tests fail
allowed-tools: SlashCommand, Bash(npm test:*), Bash(yarn test:*), Bash(pnpm test:*)
model: inherit
dependencies: [managing-testing]
---

# /auto-test - Automatic Test Runner

Execute tests and auto-fix failures.

## Workflow Reference

**Full workflow**: [@../skills/managing-testing/references/auto-test-workflow.md](../skills/managing-testing/references/auto-test-workflow.md)

## Usage

```bash
/auto-test
```

## Workflow

```text
1. Execute Tests
   └─ Auto-detect: npm/yarn/pnpm test

2. Analyze Results
   └─ Parse failures, extract errors

3. If Failures → Invoke /fix
   └─ Pass context: tests, errors, files

4. Re-run Tests
   └─ Repeat until green or max iterations
```

## Test Discovery

| Package Manager | Command        |
| --------------- | -------------- |
| npm             | `npm test`     |
| yarn            | `yarn test`    |
| pnpm            | `pnpm test`    |
| flutter         | `flutter test` |
| make            | `make test`    |

## Example Flow

```text
/auto-test
  → npm test
  → 3 tests failed
  → /fix invoked with context
  → fixes applied
  → npm test
  → All 15 tests passed ✓
```

## Integration

Works with hooks for automatic execution after file changes.

## Related

- `/fix` - Bug fix command
- `/test` - Manual test execution
- `/code` - TDD implementation
