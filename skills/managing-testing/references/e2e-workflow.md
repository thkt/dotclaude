# E2E Testing Workflow

Generate end-to-end tests through browser automation.

## Flow

```text
/e2e
    │
    ├─ Browser automation (claude-in-chrome)
    │     ├─ Navigate to URL
    │     ├─ Record interactions
    │     └─ Capture screenshots
    │
    ├─ Generate test code
    │     └─ Playwright format
    │
    └─ Document test scenarios
```

## Claude in Chrome Tools

| Tool          | Purpose            |
| ------------- | ------------------ |
| `navigate`    | Go to URL          |
| `click`       | Click element      |
| `form_input`  | Fill form fields   |
| `read_page`   | Read page content  |
| `screenshot`  | Capture screenshot |
| `gif_creator` | Record interaction |

## Test Generation Output

Playwright format:

```typescript
import { test, expect } from "@playwright/test";

test("user can login", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "user@example.com");
  await page.fill("#password", "password");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/dashboard");
});
```

## Recording Process

1. **Start Recording**
   - Open target URL
   - Begin GIF recording

2. **Perform Actions**
   - Click, type, navigate
   - Each action captured

3. **Generate Test**
   - Convert actions to Playwright
   - Add assertions

4. **Document**
   - Save GIF for reference
   - Create test file

## Test Scenario Format

```markdown
## Scenario: User Login

**Given**: User is on login page
**When**: User enters credentials and submits
**Then**: User is redirected to dashboard

### Steps

1. Navigate to /login
2. Fill email field
3. Fill password field
4. Click submit button
5. Verify URL is /dashboard

### Generated Test

`tests/e2e/login.spec.ts`

### Recording

`docs/e2e/login-flow.gif`
```

## Output Files

```text
project/
├── tests/e2e/
│   └── [scenario].spec.ts
└── docs/e2e/
    └── [scenario].gif
```

## Best Practices

| Practice                | Reason                |
| ----------------------- | --------------------- |
| Record happy path first | Baseline behavior     |
| Add assertions          | Verify expected state |
| Use stable selectors    | Avoid flaky tests     |
| Keep tests focused      | One scenario per test |

## Integration

Works with:

- `/test` - Run generated tests
- `/auto-test` - Auto-fix failures
- `/audit` - Review test coverage

## Related

- Browser automation: [@../../automating-browser/SKILL.md](../../automating-browser/SKILL.md)
- Auto-test: [@./auto-test-workflow.md](./auto-test-workflow.md)
