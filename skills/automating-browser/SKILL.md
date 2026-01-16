---
name: automating-browser
description: Interactive browser automation using claude-in-chrome MCP tools. Best for demos, GIFs, manual testing.
allowed-tools: [Read, Glob, mcp__claude-in-chrome__*]
context: fork
---

# Browser Automation

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

| Step | Action                                |
| ---- | ------------------------------------- |
| 1    | `tabs_context_mcp` → get tab IDs      |
| 2    | `tabs_create_mcp` or use existing     |
| 3    | `navigate` with URL and tabId         |
| 4    | `read_page`, `form_input`, `computer` |
| 5    | `gif_creator` for demos               |

## Patterns

| Pattern      | Steps                                                          |
| ------------ | -------------------------------------------------------------- |
| Form Filling | read_page (filter: interactive) → identify ref_id → form_input |
| GIF Record   | start_recording → actions + screenshots → stop → export        |

## References

| Topic    | File                                   |
| -------- | -------------------------------------- |
| Tools    | `references/claude-in-chrome-tools.md` |
| Patterns | `references/common-patterns.md`        |
