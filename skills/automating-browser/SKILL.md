---
name: automating-browser
description: >
  Browser automation using agent-browser CLI. Best for E2E testing, demos, screenshots.
  Use when automating browser interactions, creating E2E tests, or when user mentions
  browser automation, E2E test, ブラウザ操作, スクリーンショット, demo, manual testing.
allowed-tools: [Read, Glob, Bash(agent-browser:*)]
context: fork
user-invocable: false
---

# Browser Automation (agent-browser)

## Core Commands

| Command                              | Purpose                         |
| ------------------------------------ | ------------------------------- |
| `agent-browser --headed open <url>`  | Open URL (visible browser)      |
| `agent-browser open <url>`           | Open URL (headless)             |
| `agent-browser snapshot -i`          | Get interactive elements (refs) |
| `agent-browser click @ref`           | Click element                   |
| `agent-browser fill @ref "text"`     | Clear and fill                  |
| `agent-browser type @ref "text"`     | Type into element               |
| `agent-browser press <key>`          | Press key (Enter, Tab, etc.)    |
| `agent-browser get text @ref`        | Read element text               |
| `agent-browser wait <sel\|ms>`       | Wait for element or time        |
| `agent-browser find <loc> <val> <a>` | Find by role/text/label + act   |
| `agent-browser screenshot [path]`    | Capture screenshot              |
| `agent-browser close`                | Close browser session           |

## Debugging Commands

| Command                                       | Purpose                    |
| --------------------------------------------- | -------------------------- |
| `agent-browser console`                       | Display console output     |
| `agent-browser errors`                        | Show JS error stack traces |
| `agent-browser network requests`              | List captured requests     |
| `agent-browser network requests --filter api` | Filter by keyword          |
| `agent-browser trace start <path>`            | Begin recording trace      |
| `agent-browser trace stop`                    | Save trace file            |

## Workflow

| Step | Action                              |
| ---- | ----------------------------------- |
| 1    | `agent-browser --headed open <url>` |
| 2    | `agent-browser snapshot -i`         |
| 3    | Use `@ref` for operations           |
| 4    | Re-snapshot after DOM changes       |
| 5    | Check `console`/`errors` regularly  |

## Key Points

| Point              | Description                                     |
| ------------------ | ----------------------------------------------- |
| Always snapshot    | Refs are only valid after snapshot              |
| Re-snapshot on DOM | After click/fill, get new refs                  |
| Check DevTools     | Run `console`/`errors` proactively, not on fail |
| Mode switch        | Close first when switching headed ↔ headless    |

## Patterns

| Pattern      | Commands                                       |
| ------------ | ---------------------------------------------- |
| Form Filling | snapshot -i → fill @ref "value" → click submit |
| Navigation   | click @ref → wait → snapshot                   |
| Screenshot   | snapshot → screenshot path.png                 |
| Debug        | action → console → errors → network requests   |
