# MCP Tool Preferences

MCP tool > built-in equivalent. ToolSearch with keyword queries (not `select:`).

| Purpose     | Use                   | NOT             | Condition                 |
| ----------- | --------------------- | --------------- | ------------------------- |
| URL fetch   | `mcp__scout__fetch`   | `WebFetch`      | Always                    |
| Web search  | `mcp__scout__search`  | `WebSearch`     | Always                    |
| Code search | `mcp__yomu__explorer` | `Task(Explore)` | Frontend concept search   |
|             | `Task(Explore)`       | —               | Non-frontend or unindexed |

## yomu

Frontend (TS/TSX/JS/CSS/HTML) concept/behavior/intent search →
`mcp__yomu__explorer`. Do not substitute with grep/glob.

| yomu                                    | grep/glob                               |
| --------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow" | Known identifier: `useAuth`             |
| Related: "hooks that do Y"              | Known path: `src/components/Button.tsx` |
| Unknown name: "where does X happen"     | Literal: error messages, class names    |
