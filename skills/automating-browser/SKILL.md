---
name: automating-browser
description: >
  Browser automation using agent-browser CLI. Best for E2E testing, demos, screenshots.
  Triggers: browser automation, E2E test, ブラウザ操作, スクリーンショット, demo, manual testing.
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
| `agent-browser get styles @ref`      | Get computed CSS styles (v0.6+) |
| `agent-browser wait <sel\|ms>`       | Wait for element or time        |
| `agent-browser find <loc> <val> <a>` | Find by role/text/label + act   |
| `agent-browser screenshot [path]`    | Capture screenshot              |
| `agent-browser record start <path>`  | Start WebM recording (v0.6+)    |
| `agent-browser record stop`          | Stop and save recording (v0.6+) |
| `agent-browser connect <port>`       | Connect via CDP (v0.6+)         |
| `agent-browser close`                | Close browser session           |

## Workflow

| Step | Action                              |
| ---- | ----------------------------------- |
| 1    | `agent-browser --headed open <url>` |
| 2    | `agent-browser snapshot -i`         |
| 3    | Use `@ref` for operations           |
| 4    | Re-snapshot after DOM changes       |

## Key Points

| Point              | Description                                  |
| ------------------ | -------------------------------------------- |
| Always snapshot    | Refs are only valid after snapshot           |
| Re-snapshot on DOM | After click/fill, get new refs               |
| Mode switch        | Close first when switching headed ↔ headless |

## Patterns

| Pattern      | Commands                                       |
| ------------ | ---------------------------------------------- |
| Form Filling | snapshot -i → fill @ref "value" → click submit |
| Navigation   | click @ref → wait → snapshot                   |
| Screenshot   | snapshot → screenshot path.png                 |
