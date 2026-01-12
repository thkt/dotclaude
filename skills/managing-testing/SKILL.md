---
name: managing-testing
description: >
  Testing workflow patterns: E2E test generation, test orchestration.
  Provides templates and processes for automated testing.
  Triggers: testing, E2E, end-to-end, playwright, test runner, test orchestration.
allowed-tools: Read, Write, Glob, Task, Bash
user-invocable: false
---

# Managing Testing Workflows

Testing workflow patterns for automated test execution and E2E test generation.

## Purpose

Centralize testing workflow patterns that were embedded in individual commands.
Commands become thin orchestrators that reference this skill for testing logic.

## Workflow References

| Workflow    | Reference                                                     | Command |
| ----------- | ------------------------------------------------------------- | ------- |
| E2E Testing | [@./references/e2e-workflow.md](./references/e2e-workflow.md) | /e2e    |

**Note**: For automated test iteration, use `/ralph-loop` (official plugin).

## Quick Reference

### E2E Testing Flow

```text
1. Browser automation (claude-in-chrome)
2. Record user interactions
3. Generate Playwright test code
4. Document test scenarios
```

### Test Discovery Priority

1. Read `README.md` → Scripts section
2. Check `package.json` → scripts
3. Search for test files (`*.test.*`, `*.spec.*`)
4. Ask user if not found

### Common Test Commands

| Package Manager | Command      |
| --------------- | ------------ |
| npm             | `npm test`   |
| yarn            | `yarn test`  |
| pnpm            | `pnpm test`  |
| vitest          | `npx vitest` |
| jest            | `npx jest`   |

## Integration with TDD

### RGRC + Ralph Loop

```text
/code (RGRC cycle)
    │
    ├── Red: Write failing test
    ├── Green: Minimal implementation
    ├── Refactor: Apply principles
    └── Commit: Save state

/ralph-loop (automated iteration)
    │
    ├── Run tests
    ├── Fix failures
    └── Repeat until completion-promise
```

## Browser Automation (E2E)

### Claude in Chrome Tools

| Tool          | Purpose            |
| ------------- | ------------------ |
| `navigate`    | Go to URL          |
| `click`       | Click element      |
| `form_input`  | Fill form fields   |
| `read_page`   | Read page content  |
| `screenshot`  | Capture screenshot |
| `gif_creator` | Record interaction |

### E2E Test Output

```typescript
test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.fill("#password", "password");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## References

### Principles (rules/)

- [@../../rules/development/COMPLETION_CRITERIA.md](../../rules/development/COMPLETION_CRITERIA.md) - Quality gates

### Related Skills

- `generating-tdd-tests` - TDD fundamentals
- `automating-browser` - Browser automation
- `orchestrating-workflows` - Implementation workflows

### Used by Commands

- `/e2e` - E2E test generation
- `/test` - Manual test execution
- `/ralph-loop` - Automated iteration (official plugin)
