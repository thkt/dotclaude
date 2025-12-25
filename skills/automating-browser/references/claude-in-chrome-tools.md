# claude-in-chrome MCP Tools Reference

Complete reference for all claude-in-chrome MCP tools.

## Navigation & Tabs

| Tool | Parameters | Returns |
| --- | --- | --- |
| `tabs_context_mcp` | `createIfEmpty?` | Tab IDs in group |
| `tabs_create_mcp` | - | New tab ID |
| `navigate` | `url`, `tabId` | - |
| `resize_window` | `width`, `height`, `tabId` | - |

### tabs_context_mcp

**Always call first** to get available tabs.

```text
Parameters:
  createIfEmpty: boolean (optional) - Create tab if none exists
Returns:
  List of tab IDs in the MCP group
```

### navigate

```text
Parameters:
  url: string - URL to navigate (https:// added if missing)
  tabId: number - Tab ID from tabs_context_mcp
Special values:
  url: "back" - Go back in history
  url: "forward" - Go forward in history
```

## Reading Content

| Tool | Parameters | Returns |
| --- | --- | --- |
| `read_page` | `tabId`, `depth?`, `filter?`, `ref_id?` | Accessibility tree |
| `find` | `query`, `tabId` | Matching elements with refs |
| `get_page_text` | `tabId` | Plain text content |

### read_page

Get page structure as accessibility tree.

```text
Parameters:
  tabId: number (required)
  depth: number (optional, default: 15) - Tree depth
  filter: "interactive" | "all" (optional) - Element filter
  ref_id: string (optional) - Focus on specific element
Returns:
  Accessibility tree with element references (ref_1, ref_2, etc.)
```

### find

Natural language element search.

```text
Parameters:
  query: string - Description of element (e.g., "search bar", "login button")
  tabId: number
Returns:
  Up to 20 matching elements with references
```

### get_page_text

Extract article/main text content.

```text
Parameters:
  tabId: number
Returns:
  Plain text without HTML
```

## Interaction

| Tool | Parameters | Returns |
| --- | --- | --- |
| `computer` | `action`, `tabId`, action-specific params | Screenshots/results |
| `form_input` | `ref`, `value`, `tabId` | - |
| `javascript_tool` | `action`, `text`, `tabId` | JS result |

### form_input

Set form field values.

```text
Parameters:
  tabId: number
  ref: string - Element reference (e.g., "ref_5")
  value: string | boolean | number - Value to set
```

### javascript_tool

Execute JavaScript in page context.

```text
Parameters:
  tabId: number
  action: "javascript_exec" (required)
  text: string - JS code to execute
Note:
  Don't use 'return' - just write the expression
  Example: "window.scrollY" not "return window.scrollY"
```

## computer Actions

The `computer` tool supports multiple actions:

### Click Actions

| Action | Required | Description |
| --- | --- | --- |
| `left_click` | `coordinate` or `ref` | Single click |
| `double_click` | `coordinate` | Double click |
| `triple_click` | `coordinate` | Triple click (select line) |
| `right_click` | `coordinate` | Context menu |

```text
Example:
  action: "left_click"
  ref: "ref_10"
  # Or
  coordinate: [100, 200]
  modifiers: "ctrl+shift" (optional)
```

### Input Actions

| Action | Required | Description |
| --- | --- | --- |
| `type` | `text` | Type text |
| `key` | `text` | Press key(s) |

```text
Key examples:
  text: "Enter"
  text: "Tab"
  text: "cmd+a" (Mac) / "ctrl+a" (Windows)
  text: "Backspace Backspace Delete" (multiple keys)
  repeat: 5 (optional - repeat key press)
```

### Navigation Actions

| Action | Required | Description |
| --- | --- | --- |
| `scroll` | `scroll_direction`, `coordinate` | Scroll page |
| `scroll_to` | `ref` | Scroll element into view |
| `hover` | `coordinate` or `ref` | Move cursor |

```text
scroll_direction: "up" | "down" | "left" | "right"
scroll_amount: 1-10 (optional, default: 3)
```

### Capture Actions

| Action | Required | Description |
| --- | --- | --- |
| `screenshot` | - | Capture visible area |
| `zoom` | `region` | Capture specific region |
| `wait` | `duration` | Pause execution |

```text
zoom region: [x0, y0, x1, y1] - Rectangle coordinates
wait duration: 0-30 seconds
```

## Recording

### gif_creator

Record interactions as GIF.

```text
Parameters:
  tabId: number
  action: "start_recording" | "stop_recording" | "export" | "clear"

Export options:
  download: true (required for export)
  filename: string (optional)
  options:
    showClickIndicators: boolean (default: true)
    showActionLabels: boolean (default: true)
    showProgressBar: boolean (default: true)
    showDragPaths: boolean (default: true)
    showWatermark: boolean (default: true)
    quality: 1-30 (default: 10, lower = better)
```

### Recording Workflow

```markdown
1. gif_creator action: "start_recording"
2. computer action: "screenshot"  # Initial frame
3. ... perform actions ...
4. computer action: "screenshot"  # Final frame
5. gif_creator action: "stop_recording"
6. gif_creator action: "export", download: true
```

## Debugging

| Tool | Parameters | Description |
| --- | --- | --- |
| `read_console_messages` | `tabId`, `pattern?`, `limit?`, `clear?`, `onlyErrors?` | Console logs |
| `read_network_requests` | `tabId`, `urlPattern?`, `limit?`, `clear?` | Network activity |

### read_console_messages

```text
Parameters:
  tabId: number
  pattern: string (optional) - Regex filter
  limit: number (optional, default: 100)
  onlyErrors: boolean (optional) - Errors only
  clear: boolean (optional) - Clear after read
```

### read_network_requests

```text
Parameters:
  tabId: number
  urlPattern: string (optional) - URL contains filter
  limit: number (optional, default: 100)
  clear: boolean (optional) - Clear after read
```

## Other Tools

### update_plan

Request user approval for multi-domain operations.

```text
Parameters:
  domains: string[] - Domains to visit
  approach: string[] - What you'll do
```

### upload_image

Upload screenshot to form or drop target.

```text
Parameters:
  tabId: number
  imageId: string - From screenshot
  ref: string | coordinate: [x, y] - Target
```

### shortcuts_list / shortcuts_execute

List and run browser shortcuts.

```text
shortcuts_list:
  tabId: number

shortcuts_execute:
  tabId: number
  command: string - Shortcut name
```
