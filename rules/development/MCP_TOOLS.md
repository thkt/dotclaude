# MCP Tool Preferences

## Rule

MCP tool > built-in equivalent. Use ToolSearch keyword queries (not `select:`)
to include MCP candidates in comparison.

## Override Map

| Purpose      | Use                   | NOT             | When                                         |
| ------------ | --------------------- | --------------- | -------------------------------------------- |
| URL fetch    | `mcp__scout__fetch`   | `WebFetch`      | Always                                       |
| Web search   | `mcp__scout__search`  | `WebSearch`     | Always                                       |
| Code explore | `mcp__yomu__explorer` | `Task(Explore)` | Frontend (TS/TSX/JS/CSS/HTML) concept search |
|              | `Task(Explore)`       | —               | Non-frontend, or yomu unindexed project      |
