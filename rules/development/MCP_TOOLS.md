# Tool Preferences

MCP tool > built-in equivalent. ToolSearch with keyword queries (not `select:`).
Bash commands are auto-rewritten to RTK by PreToolUse hook (no manual action).

| Purpose     | Use                   | NOT             | Condition                 |
| ----------- | --------------------- | --------------- | ------------------------- |
| URL fetch   | `mcp__scout__fetch`   | `WebFetch`      | Always                    |
| Web search  | `mcp__scout__search`  | `WebSearch`     | Always                    |
| Code search | `mcp__yomu__explorer` | `Task(Explore)` | Frontend concept search   |
|             | `Task(Explore)`       | —               | Non-frontend or unindexed |

## yomu

Frontend (TS/TSX/JS/CSS/HTML) code search → default to `mcp__yomu__explorer`.
Prefer yomu even for simple searches to build embedding coverage over time.

| yomu (default)                          | grep/glob (exception)                   |
| --------------------------------------- | --------------------------------------- |
| Concept: "form validation", "auth flow" | Literal: error messages, regex          |
| Related: "hooks that do Y"              | Known path: `src/components/Button.tsx` |
| Known identifier: `useAuth`             | File listing: `**/*.tsx`                |
| Unknown name: "where does X happen"     |                                         |

## RTK (Rust Token Killer)

Token-optimized CLI proxy. Bash commands are auto-rewritten by hook — no manual
`rtk` prefix needed.

### Meta Commands (use directly)

```bash
rtk gain              # Token savings analytics
rtk gain --history    # Command usage history with savings
rtk discover          # Analyze Claude Code history for missed opportunities
```

### Notes

- Auto-rewrite covers: git, gh, cargo, vitest, tsc, eslint, docker, kubectl,
  curl, etc.
- If `rtk gain` fails: may have wrong rtk installed (reachingforthejack/rtk)
- Verify: `rtk --version` should show `rtk X.Y.Z`
