---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[test-name]"
---

# /e2e - E2E Test Generation

Generate documentation and Playwright tests through browser operations.

## Input

- Argument: test name (required)
- If missing: prompt via AskUserQuestion

## Execution

Browser operations via `claude-in-chrome`, then generate Playwright tests.

## Tools

| Tool          | Purpose            |
| ------------- | ------------------ |
| `navigate`    | Go to URL          |
| `click`       | Click element      |
| `form_input`  | Fill form fields   |
| `read_page`   | Read page content  |
| `screenshot`  | Capture screenshot |
| `gif_creator` | Record interaction |

## Playwright Format

```typescript
test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## Scenario Format

```markdown
**Given**: User is on login page
**When**: User enters credentials and submits
**Then**: User is redirected to dashboard
```

## Best Practices

| Practice                | Reason                |
| ----------------------- | --------------------- |
| Record happy path first | Baseline behavior     |
| Add assertions          | Verify expected state |
| Use stable selectors    | Avoid flaky tests     |
| One scenario per test   | Keep focused          |

## Output

```text
tests/e2e/[test-name]/
├── README.md          # Documentation
├── screenshots/       # Step images
└── [name].spec.ts     # Playwright test
```
