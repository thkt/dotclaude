# E2E Testing with agent-browser

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

| Method  | Command                          | Purpose                |
| ------- | -------------------------------- | ---------------------- |
| Visual  | `screenshot`                     | Compare layout         |
| Content | `get text <sel>`                 | Check text content     |
| State   | `snapshot -i` + check refs       | Verify element exists  |
| Console | `console` / `errors`             | No JS errors           |
| Network | `network requests --filter /api` | API calls succeeded    |
| Trace   | `trace start` / `trace stop`     | Capture full execution |

## Error Scenarios

| Test          | Verify                             |
| ------------- | ---------------------------------- |
| Invalid login | Error message, still on login page |
| Empty form    | Validation errors shown            |
| 404 page      | 404 displayed, "go home" works     |

## Debugging During Tests

```bash
# After each action, check for errors:
agent-browser errors

# If something fails, check console:
agent-browser console

# For flaky tests, use trace:
agent-browser trace start test.zip
# ... run test steps ...
agent-browser trace stop
# Open test.zip with Playwright Trace Viewer
```

## Best Practices

| Principle       | Rule                                                    |
| --------------- | ------------------------------------------------------- |
| Independence    | Each test from clean state, no dependencies             |
| Reliability     | Use refs not selectors, add waits, re-snapshot on DOM   |
| Debugging       | Check `console`/`errors` after key actions              |
| Maintainability | Document purpose, descriptive names, one thing per test |
| Performance     | Reuse `state save/load` for auth, parallelize           |

## Test Session Management

| Pattern        | Commands                                               |
| -------------- | ------------------------------------------------------ |
| Clean slate    | `--session test-{timestamp}` for isolation             |
| Shared auth    | `state save auth.json` once, `state load` in each test |
| Parallel tests | Different `--session` per test to avoid conflicts      |
