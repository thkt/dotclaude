# E2E Testing

## Test Structure

| Phase   | Purpose                    |
| ------- | -------------------------- |
| Setup   | Navigate to starting point |
| Execute | Perform user actions       |
| Verify  | Check expected outcomes    |
| Cleanup | Reset state if needed      |

## Common Scenarios

| Scenario   | Key Steps                                            |
| ---------- | ---------------------------------------------------- |
| Auth       | Login → verify dashboard → logout → verify redirect  |
| Form       | Navigate → fill fields → submit → verify success     |
| Navigation | Home → click link → verify page → test back          |
| Search     | Enter query → submit → verify results → click result |

## Verification Techniques

| Method            | Tool                                       | Purpose                   |
| ----------------- | ------------------------------------------ | ------------------------- |
| Visual            | `screenshot`                               | Compare layout            |
| Content           | `get_page_text`                            | Check strings, no errors  |
| Structure         | `read_page filter: "interactive"`          | Count/verify elements     |
| Console           | `read_console_messages onlyErrors: true`   | No JS errors              |
| Network           | `read_network_requests urlPattern: "/api"` | API calls succeeded       |
| Visual Regression | Playwright `toHaveScreenshot()`            | Detect unintended changes |

## Error Scenarios

| Test          | Verify                             |
| ------------- | ---------------------------------- |
| Invalid login | Error message, still on login page |
| Empty form    | Validation errors shown            |
| 404 page      | 404 displayed, "go home" works     |

## Best Practices

| Principle       | Rule                                                    |
| --------------- | ------------------------------------------------------- |
| Independence    | Each test from clean state, no dependencies             |
| Reliability     | Use refs not coordinates, add waits, retry flaky ops    |
| Maintainability | Document purpose, descriptive names, one thing per test |
| Performance     | Minimize waits, reuse setup, parallelize                |
