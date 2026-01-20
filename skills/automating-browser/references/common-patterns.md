# Browser Automation Patterns

## Core Patterns

| Pattern | Steps                                                          |
| ------- | -------------------------------------------------------------- |
| Setup   | `--headed open <url>` → `snapshot -i` → interact               |
| Form    | `snapshot -i` → `fill @ref "val"` → `click @submit`            |
| Search  | `fill @search "query"` → `press Enter` → `wait` → `snapshot`   |
| Login   | `fill @user` → `fill @pass` → `click @login` → `wait` → verify |

## Debugging Workflow

| Step | Action                          | Purpose             |
| ---- | ------------------------------- | ------------------- |
| 1    | Run operation                   | Execute the action  |
| 2    | `console` or `errors`           | Check for JS errors |
| 3    | `network requests --filter api` | Verify API calls    |
| 4    | `screenshot` (if needed)        | Visual verification |

## Recording Pattern

| Step | Action                              |
| ---- | ----------------------------------- |
| 1    | `trace start recording.zip`         |
| 2    | Perform operations                  |
| 3    | `trace stop`                        |
| 4    | Review with Playwright Trace Viewer |

## Error Handling

| Issue             | Diagnostic                          | Solution                       |
| ----------------- | ----------------------------------- | ------------------------------ |
| Element not found | `snapshot -i` to verify refs        | Re-snapshot, check selector    |
| Click no effect   | `console` for JS errors             | Fix JS error, retry            |
| Page not loading  | `network requests` for failed calls | Check network, increase wait   |
| Unexpected state  | `errors` for stack traces           | Debug from error source        |
| Flaky behavior    | `trace start` to capture all        | Review trace for timing issues |

## Responsive Testing

| Device  | Command                  |
| ------- | ------------------------ |
| Desktop | `set viewport 1920 1080` |
| Tablet  | `set viewport 768 1024`  |
| Mobile  | `set device "iPhone 14"` |

## Best Practices

| Do                                 | Don't                            |
| ---------------------------------- | -------------------------------- |
| `snapshot -i` after DOM changes    | Assume refs persist after action |
| Check `console`/`errors` regularly | Wait for errors to appear        |
| Use `wait` before assertions       | Race against async operations    |
| Use `--headed` for debugging       | Debug in headless mode           |
| Use `trace` for complex scenarios  | Guess at timing issues           |
| Use `@ref` from snapshot           | Hardcode CSS selectors           |

## Session Persistence

| Pattern          | Commands                                        |
| ---------------- | ----------------------------------------------- |
| Save login state | Login → `state save auth.json`                  |
| Reuse login      | `state load auth.json` → `open <protected-url>` |
| Isolated test    | `--session test1` to avoid cross-contamination  |
