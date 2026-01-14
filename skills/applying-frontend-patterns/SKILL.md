---
name: applying-frontend-patterns
description: Framework-agnostic frontend component design patterns.
allowed-tools: [Read, Grep, Glob, Task]
user-invocable: false
---

# Frontend Patterns

Component design patterns for maintainable frontend architecture.

## Core Patterns

| Pattern                  | Concept                   | When to Use             |
| ------------------------ | ------------------------- | ----------------------- |
| Container/Presentational | Separate logic from UI    | Data fetching + display |
| Custom Hooks             | Reusable stateful logic   | Shared behavior         |
| Composition              | Build complex from simple | Flexible components     |
| State Management         | Organize app data         | Local → Shared → Global |

## Container/Presentational

| Container (Logic) | Presentational (UI)     |
| ----------------- | ----------------------- |
| Fetches data      | Receives data via props |
| Manages state     | Stateless (ideally)     |
| Handles events    | Calls callback props    |
| No styling        | All styling lives here  |

## Hooks Guidelines (React)

| Hook        | Use For              | Pitfall                |
| ----------- | -------------------- | ---------------------- |
| useEffect   | Side effects         | Missing dependencies   |
| useMemo     | Expensive compute    | Premature optimization |
| useCallback | Stable function refs | Over-memoization       |

## State Management Strategy

| Scope  | Tool          | Example            |
| ------ | ------------- | ------------------ |
| Local  | useState      | Form input, toggle |
| Shared | Context       | Theme, auth status |
| Global | Zustand/Redux | App-wide cache     |

## When NOT to Use Patterns

- Simple one-off components
- Prototypes (YAGNI)
- No reuse expected

**Rule**: Add patterns when pain is felt, not anticipated.

## References

- [@./references/container-presentational.md] - Detailed guide
