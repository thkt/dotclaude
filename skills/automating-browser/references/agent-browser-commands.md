# agent-browser Commands

CLI reference for [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser).

## Contents

- [Navigation](#navigation)
- [Element Interaction](#element-interaction)
- [Data Retrieval](#data-retrieval)
- [Semantic Finding](#semantic-finding)
- [Waiting](#waiting)
- [Snapshot](#snapshot-accessibility-tree)
- [Screenshot & Export](#screenshot--export)
- [Debugging](#debugging-devtools)
- [Network](#network)
- [Browser Configuration](#browser-configuration)
- [Storage & Cookies](#storage--cookies)
- [Session Management](#session-management)
- [Tabs & Windows](#tabs--windows)
- [Dialogs](#dialogs)
- [Global Options](#global-options)

## Navigation

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `open <url>`     | Navigate to URL                |
| `back`           | Go back in history             |
| `forward`        | Go forward in history          |
| `reload`         | Refresh page                   |
| `close`          | Shut down browser              |
| `connect <port>` | Attach via CDP (DevTools port) |

## Element Interaction

| Command                | Description              |
| ---------------------- | ------------------------ |
| `click <sel>`          | Click element            |
| `dblclick <sel>`       | Double-click             |
| `fill <sel> "text"`    | Clear and fill           |
| `type <sel> "text"`    | Type into element        |
| `press <key>`          | Keyboard input           |
| `hover <sel>`          | Move cursor over element |
| `select <sel> <value>` | Choose dropdown option   |
| `check/uncheck <sel>`  | Toggle checkbox          |
| `focus <sel>`          | Set focus                |

## Data Retrieval

| Command                 | Returns                  |
| ----------------------- | ------------------------ |
| `get text <sel>`        | Text content             |
| `get html <sel>`        | innerHTML                |
| `get value <sel>`       | Input field value        |
| `get attr <sel> <attr>` | Attribute value          |
| `get title`             | Page title               |
| `get url`               | Current URL              |
| `get count <sel>`       | Matching element count   |
| `get box <sel>`         | Bounding box coordinates |

## Semantic Finding

| Command                              | Description          |
| ------------------------------------ | -------------------- |
| `find role <role> <action>`          | Locate by ARIA role  |
| `find text <text> <action>`          | Find by visible text |
| `find label <label> <action>`        | Search via label     |
| `find testid <id> <action>`          | Use data-testid      |
| `find first/last/nth <sel> <action>` | Get specific match   |

Actions: `click`, `fill`, `check`, `hover`, `text`

## Waiting

| Command                   | Description             |
| ------------------------- | ----------------------- |
| `wait <sel>`              | Until element visible   |
| `wait <ms>`               | Pause execution         |
| `wait --text "text"`      | Until text appears      |
| `wait --url "**/path"`    | Until URL matches       |
| `wait --load networkidle` | Until network idle      |
| `wait --fn "expression"`  | Until JS condition true |

## Snapshot (Accessibility Tree)

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `snapshot`          | Full accessibility tree with refs |
| `snapshot -i`       | Interactive elements only         |
| `snapshot -c`       | Compact (no empty nodes)          |
| `snapshot -d <n>`   | Limit depth                       |
| `snapshot -s <sel>` | Scope to CSS selector             |

## Screenshot & Export

| Command             | Description          |
| ------------------- | -------------------- |
| `screenshot [path]` | Capture visible area |
| `screenshot --full` | Capture entire page  |
| `pdf <path>`        | Export as PDF        |

## Debugging (DevTools)

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `console`            | Display console output       |
| `console --clear`    | Clear console messages       |
| `errors`             | Show page error stack traces |
| `errors --clear`     | Clear error log              |
| `highlight <sel>`    | Visually mark element        |
| `trace start [path]` | Begin recording trace        |
| `trace stop [path]`  | Save trace file              |

## Network

| Command                             | Description            |
| ----------------------------------- | ---------------------- |
| `network requests`                  | List captured requests |
| `network requests --filter <term>`  | Filter by keyword      |
| `network route <url>`               | Intercept requests     |
| `network route <url> --abort`       | Block requests         |
| `network route <url> --body <json>` | Mock response          |
| `network unroute [url]`             | Remove route handlers  |

## Browser Configuration

| Command                   | Description           |
| ------------------------- | --------------------- |
| `set viewport <w> <h>`    | Adjust window size    |
| `set device <name>`       | Emulate device        |
| `set geo <lat> <long>`    | Configure geolocation |
| `set offline [on\|off]`   | Toggle offline mode   |
| `set media [dark\|light]` | Emulate color scheme  |

## Storage & Cookies

| Command                      | Description            |
| ---------------------------- | ---------------------- |
| `cookies`                    | Retrieve all cookies   |
| `cookies set <name> <value>` | Add cookie             |
| `cookies clear`              | Remove all cookies     |
| `storage local`              | Read all localStorage  |
| `storage local set <k> <v>`  | Set localStorage value |
| `storage local clear`        | Clear localStorage     |

## Session Management

| Command             | Description                 |
| ------------------- | --------------------------- |
| `state save <path>` | Persist auth session        |
| `state load <path>` | Restore auth session        |
| `session`           | Show active session ID      |
| `session list`      | List all sessions           |
| `--session <name>`  | Execute in isolated context |

## Tabs & Windows

| Command         | Description        |
| --------------- | ------------------ |
| `tab`           | List all tabs      |
| `tab new [url]` | Open new tab       |
| `tab <n>`       | Switch to tab      |
| `tab close [n]` | Close tab          |
| `window new`    | Open new window    |
| `frame <sel>`   | Switch to iframe   |
| `frame main`    | Return to main doc |

## Dialogs

| Command                | Description                 |
| ---------------------- | --------------------------- |
| `dialog accept [text]` | Confirm with optional input |
| `dialog dismiss`       | Cancel dialog               |

## Global Options

| Option                     | Description                    |
| -------------------------- | ------------------------------ |
| `--headed`                 | Visible browser (not headless) |
| `--session <name>`         | Isolated browser context       |
| `--executable-path <path>` | Custom browser binary          |
