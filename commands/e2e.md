# /e2e - E2E Test Generation Command

Generate documentation and Playwright tests from claude-in-chrome operations.

## Usage

```text
/e2e [test-name]
```

## Overview

1. Analyze recent claude-in-chrome operations
2. Generate documentation with screenshots (README.md)
3. Generate Playwright test code ([name].spec.ts)

## Output Directory

```text
tests/e2e/
└── [test-name]/
    ├── README.md           # Documentation with screenshots
    ├── screenshots/        # Step-by-step images
    └── [test-name].spec.ts # Playwright test
```

## Workflow

### Step 1: Execute Browser Operations

Use claude-in-chrome for interactive browser operations.

```text
User: Test the login page
Claude: [executes navigate, form_input, click, etc.]
```

### Step 2: Run /e2e Command

```text
/e2e login
```

### Step 3: Auto-generation

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
| No claude-in-chrome operations in conversation | Error: "No browser operations found. Please execute browser operations first." |
| Selector inference fails | Fallback to generic selectors (e.g., `text=`, `role=`) with warning |
| Screenshot not available | Document step without image, add note "[Screenshot not captured]" |
| tests/ directory does not exist | Auto-create `tests/e2e/[name]/` structure |

## Related Tools

- `claude-in-chrome` - Interactive browser operations
- `Playwright MCP` - Headless execution, CI integration
- `automating-browser` skill - Browser automation guide

## Notes

- Taking screenshots during operations enriches documentation
- Sensitive information (passwords, etc.) is replaced with placeholders
- Creates tests directory automatically if not present
