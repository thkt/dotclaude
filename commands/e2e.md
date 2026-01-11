---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[test-name]"
dependencies: [automating-browser, managing-testing]
---

# /e2e - E2E Test Generation

Generate documentation and Playwright tests through browser operations.

## Workflow Reference

**Full workflow**: [@../skills/managing-testing/references/e2e-workflow.md](../skills/managing-testing/references/e2e-workflow.md)

## Usage

```bash
/e2e login
/e2e checkout-flow
```

## Workflow

```text
1. Start: /e2e [test-name]
2. Confirm: Describe operations
3. Execute: Browser operations
4. Generate: Docs + Playwright tests
5. Verify: Run generated test
```

## Output

```text
tests/e2e/[test-name]/
├── README.md              # Documentation
├── screenshots/           # Step images
├── [name].spec.ts         # Playwright test
└── *-snapshots/           # Visual baselines (optional)
```

## Generated Test

```typescript
import { test, expect } from "@playwright/test";

test("login", async ({ page }) => {
  await page.goto("https://example.com/login");
  await page.fill("#email", "test@example.com");
  await page.fill("#password", "********");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## Operation Mapping

| claude-in-chrome Tool | Playwright        |
| --------------------- | ----------------- |
| `navigate`            | `page.goto(url)`  |
| `form_input`          | `page.fill(...)`  |
| `computer` (click)    | `page.click(...)` |

## Visual Regression (Optional)

```typescript
await expect(page).toHaveScreenshot("01-login.png");
```

| Environment | Threshold |
| ----------- | --------- |
| Local       | 1%        |
| CI          | 5%        |

## Verification

After generation:

1. Execute test with Playwright
2. Compare expected vs actual
3. Suggest fixes if failures

## Related

- `claude-in-chrome` - Browser operations
- `Playwright MCP` - Headless execution
- `/test` - Run all tests
