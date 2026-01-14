---
name: automating-browser
description: Interactive browser automation using claude-in-chrome MCP tools. Best for demos, GIFs, manual testing.
allowed-tools: [Read, Glob, mcp__claude-in-chrome__*]
context: fork
---

# Browser Automation

Interactive browser control using claude-in-chrome MCP extension.

## When to Use

| Use Case              | This Skill | webapp-testing |
| --------------------- | ---------- | -------------- |
| GIF recording / demos | Best       | Not supported  |
| Manual testing        | Best       | OK             |
| CI/CD automation      | OK         | Best           |

## Core Tools

| Tool               | Purpose                |
| ------------------ | ---------------------- |
| `tabs_context_mcp` | Get available tabs     |
| `tabs_create_mcp`  | Create new tab         |
| `navigate`         | Go to URL              |
| `read_page`        | Get page structure     |
| `find`             | Element search         |
| `form_input`       | Fill form fields       |
| `computer`         | Mouse/keyboard actions |
| `gif_creator`      | Record interactions    |

## Workflow

1. **Start**: `tabs_context_mcp` → get tab IDs
2. **Create/Reuse**: `tabs_create_mcp` or use existing
3. **Navigate**: `navigate` with URL and tabId
4. **Interact**: `read_page`, `form_input`, `computer`
5. **Record**: `gif_creator` for demos

## Common Patterns

### Form Filling

```text
1. read_page with filter: "interactive"
2. Identify input ref_id
3. form_input with ref and value
```

### GIF Recording

```text
1. gif_creator action: "start_recording"
2. Perform actions with screenshots
3. gif_creator action: "stop_recording"
4. gif_creator action: "export"
```

## References

- [@./references/claude-in-chrome-tools.md] - Complete tool docs
- [@./references/common-patterns.md] - Reusable patterns
