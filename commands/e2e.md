---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, Bash(agent-browser:*)
model: opus
argument-hint: "[test-name]"
---

# /e2e - E2E Test Generation

Generate documentation and Playwright tests through browser operations.

## Input

- Argument: test name (required)
- If missing: prompt via AskUserQuestion

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
| `agent-browser get text @ref`       | Read element text               |
| `agent-browser screenshot [path]`   | Capture screenshot              |
| `agent-browser close`               | Close browser session           |

## Workflow

1. `agent-browser --headed open <url>` - ページを開く
2. `agent-browser snapshot -i` - インタラクティブ要素を取得
3. `@ref` を使って操作（click, fill, type）
4. DOM 変更後は再度 `snapshot` を取得

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
