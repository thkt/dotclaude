---
description: Generate documentation and Playwright tests through guided browser operations
allowed-tools: Read, Write, Glob, Task, mcp__claude-in-chrome__*, mcp__playwright__*
model: opus
argument-hint: "[test-name]"
dependencies: [automating-browser]
---

# /e2e - E2E Test Generation Command

Generate documentation and Playwright tests through guided browser operations.

## Usage

```text
/e2e [test-name]
```

## Overview

1. **Start**: Invoke command with test name
2. **Confirm**: Interactive dialog to describe and confirm operations
3. **Execute**: Perform browser operations with claude-in-chrome
4. **Generate**: Create documentation and Playwright tests

## Output Directory

```text
tests/e2e/
└── [test-name]/
    ├── README.md           # Documentation with screenshots
    ├── screenshots/        # Step-by-step images
    └── [test-name].spec.ts # Playwright test
```

## Workflow

### Step 1: Start Command

```text
/e2e login
```

### Step 2: Operation Check (Interactive Dialog)

Claude displays a structured check similar to PRE_TASK_CHECK:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 E2E Test: login

📋 Please describe the operations to test:
   Example: "Navigate to login page, enter credentials, click submit"

❓ Required information:
   - Target URL (if known)
   - User actions to perform
   - Expected outcome

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

User describes operations, then Claude confirms:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 Understanding: ██████████ 95%

✅ Operations to execute:
   1. Navigate to https://example.com/login
   2. Fill email field with test value
   3. Fill password field with test value
   4. Click login button

🎯 Expected result:
   - Redirect to dashboard
   - Login success

⚡ Ready to execute? (y/n)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Note**: Use `AskUserQuestion` tool for confirmation dialog.

### Step 3: Execute Browser Operations

After user confirms (y), Claude uses claude-in-chrome to:

- Navigate to target URL
- Fill form fields
- Click buttons
- Take screenshots at each step

### Step 4: Auto-generation

The following are automatically generated:

**README.md (Documentation)**:

```markdown
# Login Test

## Steps

### 1. Navigate to login page
![Step 1](./screenshots/01-navigate.png)
- URL: https://example.com/login

### 2. Fill email field
![Step 2](./screenshots/02-fill-email.png)
- Selector: #email
- Value: test@example.com
...
```

**[name].spec.ts (Playwright Test)**:

```typescript
import { test, expect } from '@playwright/test';

test('login', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', '********');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## Generation Logic

### Operation Extraction from Conversation

Extract the following MCP tool calls from recent conversation:

| Tool | Playwright Conversion |
| --- | --- |
| `navigate` | `page.goto(url)` |
| `form_input` | `page.fill(selector, value)` |
| `computer` (click) | `page.click(selector)` |
| `computer` (type) | `page.type(selector, text)` |
| `computer` (screenshot) | Save screenshot |

### Selector Conversion

Infer actual selectors from claude-in-chrome's `ref` (e.g., `ref_5`):

- Identify elements from accessibility tree
- Select optimal selector from id, name, role, text, etc.

## Error Handling

| Scenario | Behavior |
| --- | --- |
| test-name not provided | Prompt: "Please provide a test name (e.g., /e2e login)" |
| claude-in-chrome not available | Error: "Browser automation not available. Please check Chrome and extension." |
| User cancels operation dialog | Exit gracefully without generating files |
| Navigation fails | Report error, ask if user wants to continue or abort |
| Selector inference fails | Fallback to generic selectors (e.g., `text=`, `role=`) with warning |
| Screenshot not available | Document step without image, add note "[Screenshot not captured]" |
| tests/ directory does not exist | Auto-create `tests/e2e/[name]/` structure |

### Step 5: Verify Generated Test (verify-app)

After generating test files, automatically verify them:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Verification Step

Running generated Playwright test...

⏳ Executing: npx playwright test [test-name].spec.ts

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Verification Process**:

1. Execute generated test with Playwright MCP
2. Compare expected vs actual results
3. Report discrepancies with suggestions

**Verification Results**:

| Result | Action |
| --- | --- |
| ✅ All assertions pass | Report success, test is ready |
| ⚠️ Some assertions fail | Show diff, suggest selector fixes |
| ❌ Test execution fails | Report error, offer to regenerate |

**Auto-fix Suggestions**:

When verification fails, Claude suggests:

- Alternative selectors (id → role → text)
- Timing adjustments (waitForSelector, timeout)
- Assertion corrections based on actual DOM

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Verification Results

Test: login.spec.ts
Status: ⚠️ 1/3 assertions failed

Failed Assertion:
  Expected: await expect(page).toHaveURL('/dashboard')
  Actual: URL is '/dashboard?welcome=true'

Suggested Fix:
  await expect(page).toHaveURL(/\/dashboard/)

Apply fix? (y/n)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Related Tools

- `claude-in-chrome` - Interactive browser operations
- `Playwright MCP` - Headless execution, CI integration, verification
- [@../skills/automating-browser/SKILL.md](../skills/automating-browser/SKILL.md) - Browser automation guide

## Notes

- Taking screenshots during operations enriches documentation
- Sensitive information (passwords, etc.) is replaced with placeholders
- Creates tests directory automatically if not present
- **Verification loop** improves test reliability by 2-3x (Boris workflow)
