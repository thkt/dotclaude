---
name: vercel-react
description: >
  React/Next.js performance rules from Vercel Engineering. Triggers on: React
  components, Next.js pages, data fetching, bundle optimization.
allowed-tools: [Read, Bash, Glob]
user-invocable: false
---

# Vercel React Performance Rules

Source: `vercel-labs/agent-skills` (react-best-practices)

## How to Use

1. Find relevant rule(s) from the index below
2. Read cached rule: `~/.claude/skills/vercel-react/cache/{rule}.md`
3. If not cached:
   `bash ~/.claude/skills/vercel-react/scripts/fetch-rule.sh {rule}`
4. Bulk sync: `bash ~/.claude/skills/vercel-react/scripts/sync.sh`

## Behavior

- Code review / writing: check CRITICAL + HIGH rules first
- Only check MEDIUM/LOW if user specifically asks for deep optimization
- Fetch only the rules relevant to the code at hand (not all 58)

## Priority Index

### 1. Eliminating Waterfalls — CRITICAL

| Rule                      | Description                                    |
| ------------------------- | ---------------------------------------------- |
| async-defer-await         | Move await into branches where actually used   |
| async-parallel            | Promise.all() for independent operations       |
| async-dependencies        | better-all for partial dependencies            |
| async-api-routes          | Start promises early, await late in API routes |
| async-suspense-boundaries | Suspense to stream content                     |

### 2. Bundle Size — CRITICAL

| Rule                     | Description                                 |
| ------------------------ | ------------------------------------------- |
| bundle-barrel-imports    | Import directly, avoid barrel files         |
| bundle-dynamic-imports   | next/dynamic for heavy components           |
| bundle-defer-third-party | Load analytics/logging after hydration      |
| bundle-conditional       | Load modules only when feature is activated |
| bundle-preload           | Preload on hover/focus for perceived speed  |

### 3. Server-Side — HIGH

| Rule                     | Description                                 |
| ------------------------ | ------------------------------------------- |
| server-auth-actions      | Authenticate server actions like API routes |
| server-cache-react       | React.cache() for per-request dedup         |
| server-cache-lru         | LRU cache for cross-request caching         |
| server-dedup-props       | Avoid duplicate serialization in RSC props  |
| server-hoist-static-io   | Hoist static I/O to module level            |
| server-serialization     | Minimize data passed to client components   |
| server-parallel-fetching | Restructure to parallelize fetches          |
| server-after-nonblocking | after() for non-blocking operations         |

### 4-8. MEDIUM / LOW Priority

Client-Side Data (MEDIUM-HIGH), Re-render (MEDIUM), Rendering (MEDIUM),
JS Performance (LOW-MEDIUM), Advanced (LOW) — check only when user specifically
asks for deep optimization.

→ Full rule indexes: [reference.md](reference.md)
