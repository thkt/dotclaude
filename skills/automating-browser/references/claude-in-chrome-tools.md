# claude-in-chrome MCP Tools

## Navigation & Tabs

| Tool               | Parameters                 | Description                  |
| ------------------ | -------------------------- | ---------------------------- |
| `tabs_context_mcp` | `createIfEmpty?`           | **Call first** - Get tab IDs |
| `tabs_create_mcp`  | -                          | Create new tab               |
| `navigate`         | `url`, `tabId`             | Go to URL, "back", "forward" |
| `resize_window`    | `width`, `height`, `tabId` | Resize browser               |

## Reading Content

| Tool            | Parameters                              | Returns                      |
| --------------- | --------------------------------------- | ---------------------------- |
| `read_page`     | `tabId`, `depth?`, `filter?`, `ref_id?` | Accessibility tree with refs |
| `find`          | `query`, `tabId`                        | Up to 20 matching elements   |
| `get_page_text` | `tabId`                                 | Plain text content           |

## Interaction

| Tool              | Parameters                                   | Description              |
| ----------------- | -------------------------------------------- | ------------------------ |
| `form_input`      | `ref`, `value`, `tabId`                      | Set form field value     |
| `javascript_tool` | `action: "javascript_exec"`, `text`, `tabId` | Execute JS (no `return`) |

## computer Actions

| Action         | Required Params                  | Description                    |
| -------------- | -------------------------------- | ------------------------------ |
| `left_click`   | `coordinate` or `ref`            | Single click                   |
| `double_click` | `coordinate`                     | Double click                   |
| `right_click`  | `coordinate`                     | Context menu                   |
| `type`         | `text`                           | Type text                      |
| `key`          | `text`                           | Press key(s): "Enter", "cmd+a" |
| `scroll`       | `scroll_direction`, `coordinate` | Scroll page                    |
| `scroll_to`    | `ref`                            | Scroll element into view       |
| `hover`        | `coordinate` or `ref`            | Move cursor                    |
| `screenshot`   | -                                | Capture visible area           |
| `zoom`         | `region: [x0,y0,x1,y1]`          | Capture region                 |
| `wait`         | `duration: 0-30`                 | Pause execution                |

## Recording (gif_creator)

| Action            | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `start_recording` | Begin capture                            |
| `stop_recording`  | End capture                              |
| `export`          | Generate GIF (`download: true` required) |
| `clear`           | Discard frames                           |

**Workflow**: start → screenshot (initial) → actions + screenshots → screenshot (final) → stop → export

## Debugging

| Tool                    | Key Params                         | Description      |
| ----------------------- | ---------------------------------- | ---------------- |
| `read_console_messages` | `tabId`, `pattern?`, `onlyErrors?` | Console logs     |
| `read_network_requests` | `tabId`, `urlPattern?`             | Network activity |

## Other Tools

| Tool                     | Purpose                               |
| ------------------------ | ------------------------------------- |
| `update_plan`            | Request approval for multi-domain ops |
| `upload_image`           | Upload screenshot to form/drop target |
| `shortcuts_list/execute` | Run browser shortcuts                 |
