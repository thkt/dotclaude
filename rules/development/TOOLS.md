# Tool Preferences

CLI tool > built-in equivalent. WebFetch/WebSearch are hook-routed to the appropriate CLI based on URL pattern.

## Code search

| Task                                | Use             | When                          |
| ----------------------------------- | --------------- | ----------------------------- |
| Concept / identifier / related code | `yomu search`   | TS/JSX/CSS/HTML/Rust/Markdown |
| Concept / related code              | `Grep` / `Glob` | Swift / Python / Go / other   |
| Literal regex / known exact path    | `Grep` / `Glob` | Any language                  |
| Past session search                 | `recall search` | Any language                  |

## recall triggers

Call `recall search` on any of these. Do not deliberate.

| Trigger              | Signal                                    |
| -------------------- | ----------------------------------------- |
| Temporal reference   | 「前に」「あの時」past events / decisions |
| Structural echo      | Current problem mirrors a past situation  |
| Repetition           | 「また同じ」recurring mistake             |
| Vague back-reference | 「あの件」past work without specifics     |
| Module first contact | First edit to a file/module this session  |
| BACKLOG task pickup  | Starting a task from BACKLOG.md           |

## recall + yomu parallel

Past decisions (recall) vs current code state (yomu). Run both in parallel on these triggers.

| Trigger              | recall query                  | yomu query                    |
| -------------------- | ----------------------------- | ----------------------------- |
| Module first contact | module name, design rationale | module name, related concepts |
| BACKLOG task pickup  | task name, related decisions  | task-related code             |
| Structural echo      | past similar problem          | current similar code          |
