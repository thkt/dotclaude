# Tool Preferences

CLI tool > built-in equivalent. WebFetch/WebSearch are hook-routed to the appropriate CLI based on URL pattern.

## Code search

| Task                                | Use                   | When                          |
| ----------------------------------- | --------------------- | ----------------------------- |
| Concept / identifier / related code | `yomu-search` skill   | TS/JSX/CSS/HTML/Rust/Markdown |
| Concept / related code              | `Grep` / `Glob`       | Swift / Python / Go / other   |
| Literal regex / known exact path    | `Grep` / `Glob`       | Any language                  |
| Past session search                 | `recall-search` skill | Any language                  |

## Parallel execution

On module first contact or BACKLOG task pickup, run `yomu-search` and `recall-search` in parallel. Details in each skill.
