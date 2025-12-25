---
description: Create reusable browser automation workflows via interactive recording
aliases: [create-workflow, workflow-create]
allowed-tools: Read, Write, Task, mcp__claude-in-chrome__*
model: inherit
argument-hint: "[workflow-name]"
---

# /workflow:create - Browser Workflow Generator

Create reusable browser automation workflows using Chrome DevTools MCP through interactive step recording.

## Purpose

Generate custom browser automation workflows that can be:

- Recorded interactively through conversation
- Saved as reusable slash commands
- Executed repeatedly with `/workflow-name`
- Used for E2E testing, monitoring, or automation

## Usage

```bash
/workflow:create "workflow-name"
```

Example:

```bash
/workflow:create "login-test"
```

## How It Works

1. **Interactive Recording**: AI guides you through defining each step
2. **Live Execution**: Steps are executed in real browser as you define them
3. **Markdown Generation**: Workflow is saved as a command file
4. **Automatic Discovery**: Generated command becomes available immediately

## Workflow Recording Process

### Step 1: Initialization

```txt
You: /workflow:create "my-workflow"
AI: Creating workflow 'my-workflow'. Let's define the steps.
    What should we do first?
```

### Step 2: Define Steps Interactively

```txt
You: Navigate to https://example.com
AI: ✓ Navigated to https://example.com
    [Shows page snapshot]
    What's next?

You: Click the login button
AI: [Shows elements with UIDs]
    Which element? (Provide UID or description)

You: uid:abc123
AI: ✓ Clicked login button
    What's next?

You: Type "user@example.com" in email field
AI: [Shows input fields]
    Which field? (Provide UID)

You: uid:def456
AI: ✓ Typed in email field
    What's next?

You: done
AI: ✓ Workflow recorded!
    Saved to: .claude/commands/workflows/my-workflow.md
    Execute with: /my-workflow
```

## Generated Workflow File Structure

```markdown
# /my-workflow

Brief description of what this workflow does

## Steps

1. Navigate to https://example.com
2. Click element (uid: abc123) - login button
3. Fill element (uid: def456) with "user@example.com"
4. Click element (uid: ghi789) - submit button
5. Wait for text "Welcome" to appear

## Usage

\```bash
/my-workflow
\```

## Notes

- Created: 2025-10-02
- Chrome DevTools MCP required
```

## Available Actions

During recording, you can use these actions:

- **Navigate**: `Navigate to <URL>`
- **Click**: `Click <element description>` (AI will show available elements)
- **Fill**: `Type "<text>" in <field>` (AI will show input fields)
- **Wait**: `Wait for "<text>" to appear`
- **Screenshot**: `Take screenshot`
- **Scroll**: `Scroll to <element>`
- **Done**: `done` (finish recording)

## Claude in Chrome MCP Integration

This command uses `mcp__claude-in-chrome__*` tools:

- `navigate_page` - Navigate to URLs
- `take_snapshot` - Identify page elements
- `click` - Click elements by UID
- `fill` - Fill form fields
- `wait_for` - Wait for conditions
- `take_screenshot` - Capture screenshots

## File Location

Generated workflows are saved to:

```txt
.claude/commands/workflows/<workflow-name>.md
```

Once saved, the workflow becomes a discoverable slash command:

```bash
/workflow-name
```

## Use Cases

- **E2E Testing**: Automate UI testing workflows
- **Monitoring**: Regular checks of critical user flows
- **Data Collection**: Scraping or form automation
- **Regression Testing**: Verify features after changes
- **Onboarding**: Document and automate setup processes

## Example Workflows

### Login Test

```bash
/workflow:create "login-test"
→ Interactive steps to test login flow
→ Saved as /login-test
```

### Price Monitor

```bash
/workflow:create "check-price"
→ Navigate to product page
→ Extract price element
→ Take screenshot
→ Saved as /check-price
```

## Tips

1. **Be Specific**: Describe elements clearly for accurate selection
2. **Use Snapshots**: Review page snapshots before selecting elements
3. **Add Waits**: Include wait steps for dynamic content
4. **Test As You Go**: Each step executes immediately for verification
5. **Edit Later**: Generated Markdown files can be manually edited

## Limitations

- Requires Chrome DevTools MCP to be configured
- Complex conditional logic requires manual editing
- JavaScript execution is supported but must be added manually
- Each workflow runs in a fresh browser session

## Related Commands

- `/test` - Run comprehensive tests including browser tests
- `/auto-test` - Automatic test runner with fixes
- `/fix` - Quick bug fixes

## Technical Details

**Storage Format**: Markdown (human-editable)
**Execution Method**: Slash command system
**MCP Tool**: Chrome DevTools MCP
**Auto-discovery**: Via `.claude/commands/workflows/` directory

---

*Generated workflows are immediately available as slash commands without restart.*
