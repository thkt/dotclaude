# Common Browser Automation Patterns

Reusable patterns for browser automation tasks.

## Setup Pattern

Always start with:

```markdown
1. tabs_context_mcp → Get available tabs
2. tabs_create_mcp (if needed) → Create new tab
3. navigate → Go to target URL
4. read_page → Understand page structure
```

## Form Filling Pattern

### Simple Form

```markdown
1. read_page filter: "interactive"
2. Identify input refs
3. form_input for each field
4. find "submit button"
5. computer action: "left_click" ref: submit_ref
```

### Multi-Step Form

```markdown
1. Fill first section
2. computer action: "left_click" ref: next_button
3. wait duration: 2 (for page transition)
4. read_page (refresh structure)
5. Fill next section
6. Repeat...
```

## Search Pattern

```markdown
1. find "search input"
2. form_input ref: search_ref, value: "query"
3. computer action: "key", text: "Enter"
4. wait duration: 2
5. read_page (get results)
```

## Login Pattern

```markdown
1. navigate to login page
2. find "username input"
3. form_input for username
4. find "password input"
5. form_input for password
6. find "login button"
7. computer action: "left_click"
8. wait duration: 3
9. Verify login success
```

**Note**: Never auto-fill passwords - prompt user for input.

## Data Extraction Pattern

### Table Data

```markdown
1. read_page
2. Identify table structure from accessibility tree
3. Extract rows/cells from tree data
4. Process structured data
```

### Article Content

```markdown
1. get_page_text → Clean text content
2. Or read_page depth: 5 for structure
```

## Screenshot Documentation Pattern

```markdown
1. navigate to target
2. wait duration: 2 (allow render)
3. computer action: "screenshot"
4. Analyze/save screenshot
```

## GIF Recording Pattern

### Full Workflow Recording

```markdown
1. gif_creator action: "start_recording"
2. computer action: "screenshot" (initial state)
3. Perform action 1
4. computer action: "screenshot"
5. Perform action 2
6. computer action: "screenshot"
7. ... more actions with screenshots ...
8. computer action: "screenshot" (final state)
9. gif_creator action: "stop_recording"
10. gif_creator action: "export", download: true, filename: "workflow.gif"
```

### Tips for Good GIFs

- Take screenshot after each significant action
- Wait for animations to complete
- Use meaningful filename
- Consider quality setting (lower = better quality but larger file)

## Error Handling Pattern

### Element Not Found

```markdown
1. find "target element"
2. If not found:
   - Try alternative query
   - Scroll and retry: scroll_to or scroll action
   - Increase read_page depth
3. If still not found:
   - Take screenshot for debugging
   - Report to user
```

### Page Not Loading

```markdown
1. navigate to URL
2. wait duration: 5
3. read_page
4. If empty/error:
   - Check read_console_messages for errors
   - Check read_network_requests for failures
   - Report issue
```

## Multi-Page Workflow Pattern

```markdown
1. update_plan with domains list
2. Wait for user approval
3. For each page:
   - navigate
   - wait for load
   - perform actions
   - verify success
```

## Responsive Testing Pattern

```markdown
1. resize_window width: 1920, height: 1080
2. computer action: "screenshot" (desktop)
3. resize_window width: 768, height: 1024
4. computer action: "screenshot" (tablet)
5. resize_window width: 375, height: 812
6. computer action: "screenshot" (mobile)
```

## Debug Pattern

```markdown
1. Identify issue
2. read_console_messages pattern: "error" (check JS errors)
3. read_network_requests urlPattern: "api" (check API calls)
4. computer action: "screenshot" (visual state)
5. javascript_tool to check page state
```

## Best Practices

### Always Do

- Start with `tabs_context_mcp`
- Wait for page loads (`wait` action)
- Take screenshots before/after critical actions
- Use `ref` over `coordinate` when possible
- Handle errors gracefully

### Never Do

- Skip tab context check
- Auto-submit forms with sensitive data
- Click without verifying target
- Ignore CAPTCHA/bot detection
- Assume page structure is constant
