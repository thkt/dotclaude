---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, Bash(agent-browser:*)
model: opus
argument-hint: "[test-name]"
---

# /e2e - E2E Test Generation

Generate documentation and Playwright tests through browser operations.

## Input

- Test name: `$1` (required)
- If `$1` is empty → prompt via AskUserQuestion

## Execution

Browser operations via `agent-browser`, then generate Playwright tests.

## Tools (agent-browser commands)

| Command                             | Purpose                         |
| ----------------------------------- | ------------------------------- |
| `agent-browser --headed open <url>` | Go to URL                       |
| `agent-browser snapshot -i`         | Get interactive elements (refs) |
| `agent-browser click @ref`          | Click element                   |
| `agent-browser fill @ref "text"`    | Fill form fields (clear first)  |
| `agent-browser type @ref "text"`    | Type into element               |
| `agent-browser press <key>`         | Press key (Enter, Tab, etc.)    |
| `agent-browser get text @ref`       | Read element text               |
| `agent-browser wait <sel\|ms>`      | Wait for element or time        |
| `agent-browser screenshot [path]`   | Capture screenshot              |
| `agent-browser record start <path>` | Start WebM recording (v0.6+)    |
| `agent-browser record stop`         | Stop and save recording (v0.6+) |
| `agent-browser close`               | Close browser session           |

## Workflow

1. `agent-browser --headed open <url>` - Open page
2. `agent-browser snapshot -i` - Get interactive elements
3. Use `@ref` for operations (click, fill, type)
4. Re-snapshot after DOM changes

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

```gherkin
Given User is on login page
When User enters credentials and submits
Then User is redirected to dashboard
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
