# E2E Testing with Browser Automation

End-to-end testing patterns using claude-in-chrome MCP.

## E2E Testing Approach

### Test Structure

```markdown
1. Setup - Navigate to starting point
2. Execute - Perform user actions
3. Verify - Check expected outcomes
4. Cleanup - Reset state if needed
```

### Test Example

```markdown
Test: User can log in and view dashboard

Setup:
  - navigate to "/login"
  - wait duration: 2

Execute:
  - form_input username
  - form_input password
  - click login button
  - wait duration: 3

Verify:
  - read_page
  - Check for dashboard elements
  - Screenshot for evidence
```

## Common Test Scenarios

### Authentication Flow

```markdown
1. Navigate to login page
2. Fill credentials (mock/test account)
3. Submit form
4. Verify redirect to dashboard
5. Verify user info displayed
6. Test logout
7. Verify redirect to login
```

### Form Submission Flow

```markdown
1. Navigate to form page
2. Fill all required fields
3. Submit form
4. Verify success message
5. Verify data persisted (if applicable)
```

### Navigation Flow

```markdown
1. Start at home page
2. Click navigation link
3. Verify correct page loaded
4. Check breadcrumbs/URL
5. Test back navigation
```

### Search Flow

```markdown
1. Navigate to search page
2. Enter search query
3. Submit search
4. Verify results displayed
5. Click result
6. Verify detail page
```

## Verification Techniques

### Visual Verification

```markdown
1. computer action: "screenshot"
2. Compare with expected layout
3. Check for missing elements
```

### Content Verification

```markdown
1. get_page_text
2. Check for expected strings
3. Verify absence of error messages
```

### Structure Verification

```markdown
1. read_page filter: "interactive"
2. Count expected elements
3. Verify element hierarchy
```

### Console Verification

```markdown
1. read_console_messages onlyErrors: true
2. Verify no JavaScript errors
3. Check for expected logs
```

### Network Verification

```markdown
1. read_network_requests urlPattern: "/api"
2. Verify API calls succeeded
3. Check response status codes
```

## Test Data Management

### Test Accounts

- Use dedicated test accounts
- Never use production credentials
- Document test account access

### Test Data

- Use predictable test data
- Reset between tests if needed
- Document data dependencies

## Error Scenarios

### Test: Invalid Login

```markdown
1. Navigate to login
2. Enter invalid credentials
3. Submit
4. Verify error message displayed
5. Verify still on login page
```

### Test: Form Validation

```markdown
1. Navigate to form
2. Submit empty form
3. Verify validation errors
4. Fill required fields
5. Verify errors cleared
```

### Test: 404 Page

```markdown
1. Navigate to non-existent URL
2. Verify 404 page displayed
3. Test "go home" link
```

## Recording Test Evidence

### Screenshot Documentation

```markdown
For each test:
1. Screenshot: Initial state
2. Screenshot: After key actions
3. Screenshot: Final state
4. Screenshot: Any errors
```

### GIF Recording

```markdown
For complex flows:
1. Start GIF recording
2. Perform test steps with screenshots
3. Stop recording
4. Export with descriptive filename
```

## Test Organization

### By Feature

```text
/tests
  /auth
    login.md
    logout.md
    password-reset.md
  /forms
    contact.md
    checkout.md
  /navigation
    header.md
    footer.md
```

### By Priority

```text
/tests
  /critical     # Must pass for release
  /important    # Should pass
  /nice-to-have # Optional
```

## Best Practices

### Test Independence

- Each test starts from clean state
- No dependencies between tests
- Can run in any order

### Reliability

- Use stable selectors (ref IDs, not coordinates)
- Add appropriate waits
- Retry on flaky operations

### Maintainability

- Document test purpose
- Use descriptive names
- Keep tests focused (one thing per test)

### Performance

- Minimize waits
- Reuse setup when possible
- Parallelize independent tests

## Integration with /test Command

The `/test` command can execute browser tests:

```text
/test --e2e           # Run E2E tests
/test --browser       # Browser tests only
/test src/e2e/*.test  # Specific test files
```

## Reporting

### Test Report Format

```markdown
# E2E Test Report

## Summary
- Total: 10
- Passed: 8
- Failed: 2

## Failed Tests

### Login with invalid credentials
- Expected: Error message
- Actual: Page crashed
- Screenshot: [attached]

### Search pagination
- Expected: 10 results per page
- Actual: 15 results shown
- Screenshot: [attached]
```
