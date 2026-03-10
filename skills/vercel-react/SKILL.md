---
name: vercel-react
description: >
  React/Next.js performance rules from Vercel Engineering. Use when writing,
  reviewing, or refactoring React/Next.js code for performance. Triggers on:
  React components, Next.js pages, data fetching, bundle optimization.
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

### 4. Client-Side Data — MEDIUM-HIGH

| Rule                           | Description                        |
| ------------------------------ | ---------------------------------- |
| client-swr-dedup               | SWR for automatic request dedup    |
| client-event-listeners         | Deduplicate global event listeners |
| client-passive-event-listeners | Passive listeners for scroll       |
| client-localstorage-schema     | Version and minimize localStorage  |

### 5. Re-render — MEDIUM

| Rule                               | Description                                     |
| ---------------------------------- | ----------------------------------------------- |
| rerender-defer-reads               | Don't subscribe to state only used in callbacks |
| rerender-memo                      | Extract expensive work into memoized components |
| rerender-memo-with-default-value   | Hoist default non-primitive props               |
| rerender-dependencies              | Primitive dependencies in effects               |
| rerender-derived-state             | Subscribe to derived booleans, not raw          |
| rerender-derived-state-no-effect   | Derive state during render, not effects         |
| rerender-functional-setstate       | Functional setState for stable callbacks        |
| rerender-lazy-state-init           | Function to useState for expensive init         |
| rerender-simple-expression-in-memo | Avoid memo for simple primitives                |
| rerender-move-effect-to-event      | Interaction logic in event handlers             |
| rerender-transitions               | startTransition for non-urgent updates          |
| rerender-use-ref-transient-values  | Refs for transient frequent values              |

### 6. Rendering — MEDIUM

| Rule                                 | Description                           |
| ------------------------------------ | ------------------------------------- |
| rendering-animate-svg-wrapper        | Animate div wrapper, not SVG element  |
| rendering-content-visibility         | content-visibility for long lists     |
| rendering-hoist-jsx                  | Extract static JSX outside components |
| rendering-svg-precision              | Reduce SVG coordinate precision       |
| rendering-hydration-no-flicker       | Inline script for client-only data    |
| rendering-hydration-suppress-warning | Suppress expected mismatches          |
| rendering-activity                   | Activity component for show/hide      |
| rendering-conditional-render         | Ternary, not && for conditionals      |
| rendering-usetransition-loading      | useTransition for loading state       |

### 7. JS Performance — LOW-MEDIUM

| Rule                      | Description                              |
| ------------------------- | ---------------------------------------- |
| js-batch-dom-css          | Group CSS changes via classes or cssText |
| js-index-maps             | Build Map for repeated lookups           |
| js-cache-property-access  | Cache object properties in loops         |
| js-cache-function-results | Cache function results in module Map     |
| js-cache-storage          | Cache localStorage/sessionStorage reads  |
| js-combine-iterations     | Combine filter/map into one loop         |
| js-length-check-first     | Check length before expensive comparison |
| js-early-exit             | Return early from functions              |
| js-hoist-regexp           | Hoist RegExp outside loops               |
| js-min-max-loop           | Loop for min/max instead of sort         |
| js-set-map-lookups        | Set/Map for O(1) lookups                 |
| js-tosorted-immutable     | toSorted() for immutability              |

### 8. Advanced — LOW

| Rule                        | Description                        |
| --------------------------- | ---------------------------------- |
| advanced-event-handler-refs | Store event handlers in refs       |
| advanced-init-once          | Initialize app once per app load   |
| advanced-use-latest         | useLatest for stable callback refs |
