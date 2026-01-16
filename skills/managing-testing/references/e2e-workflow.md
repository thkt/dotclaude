# E2E Testing Workflow

## Flow

```text
/e2e → Browser automation → Generate test → Document
```

## Tools

| Tool          | Purpose            |
| ------------- | ------------------ |
| `navigate`    | Go to URL          |
| `click`       | Click element      |
| `form_input`  | Fill form fields   |
| `read_page`   | Read page content  |
| `screenshot`  | Capture screenshot |
| `gif_creator` | Record interaction |

## Output

| File      | Location                       |
| --------- | ------------------------------ |
| Test      | `tests/e2e/[scenario].spec.ts` |
| Recording | `docs/e2e/[scenario].gif`      |

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
