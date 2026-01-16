# Browser Automation Patterns

## Core Patterns

| Pattern | Steps                                                                           |
| ------- | ------------------------------------------------------------------------------- |
| Setup   | `tabs_context_mcp` → `tabs_create_mcp` → `navigate` → `read_page`               |
| Form    | `read_page filter: "interactive"` → `form_input` each → `find submit` → `click` |
| Search  | `find "search"` → `form_input` → `key: "Enter"` → `wait` → `read_page`          |
| Login   | Navigate → fill username → fill password → click login → `wait` → verify        |

## Recording Pattern

| Step | Action                        |
| ---- | ----------------------------- |
| 1    | `gif_creator start_recording` |
| 2    | screenshot (initial)          |
| 3    | action + screenshot (repeat)  |
| 4    | screenshot (final)            |
| 5    | `gif_creator stop_recording`  |
| 6    | `gif_creator export`          |

## Error Handling

| Issue             | Solution                                      |
| ----------------- | --------------------------------------------- |
| Element not found | Try alternative query, scroll, increase depth |
| Page not loading  | `wait` longer, check console/network, report  |

## Responsive Testing

| Device  | Resolution |
| ------- | ---------- |
| Desktop | 1920x1080  |
| Tablet  | 768x1024   |
| Mobile  | 375x812    |

## Best Practices

| Do                              | Don't                          |
| ------------------------------- | ------------------------------ |
| Start with `tabs_context_mcp`   | Skip tab context check         |
| Wait for page loads             | Auto-submit sensitive data     |
| Use `ref` over `coordinate`     | Click without verifying target |
| Screenshot before/after actions | Ignore CAPTCHA/bot detection   |
