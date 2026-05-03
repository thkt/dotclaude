# Tool Preferences

CLI tool > built-in equivalent. WebFetch/WebSearch are hook-routed to the appropriate CLI based on URL pattern.

## Code search

| Task                                | Use                    | When                          |
| ----------------------------------- | ---------------------- | ----------------------------- |
| Concept / identifier / related code | `use-cli-yomu` skill   | TS/JSX/CSS/HTML/Rust/Markdown |
| Concept / related code              | `ugrep` / `bfs` (Bash) | Swift / Python / Go / other   |
| Literal regex / known exact path    | `ugrep` / `bfs` (Bash) | Any language                  |
| Past session search                 | `use-cli-recall` skill | Any language                  |

## Parallel execution

On module first contact or BACKLOG task pickup, run `use-cli-yomu` and `use-cli-recall` in parallel. Details in each skill.
