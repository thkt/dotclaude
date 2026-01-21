# Performance Guidelines

## Context Management

| Strategy   | Guideline               | Rationale                           |
| ---------- | ----------------------- | ----------------------------------- |
| MCP tools  | Enable ≤10 per project  | Prevents 200k→70k context shrinkage |
| Plugins    | Enable only needed ones | Each adds token overhead            |
| `/compact` | Use when context >70%   | Preserves conversation history      |
| `/fork`    | Use for parallel tasks  | Avoids context pollution            |

## Model Selection

| Task Type                | Recommended | Rationale                |
| ------------------------ | ----------- | ------------------------ |
| Complex architecture     | Opus        | Deep reasoning needed    |
| Standard development     | Sonnet      | Balance of speed/quality |
| Quick fixes, refactoring | Haiku       | Fast, low cost           |
| Code review              | Sonnet/Opus | Quality matters          |

## Frontend Performance

| Metric      | Target           | Tool                    |
| ----------- | ---------------- | ----------------------- |
| LCP         | <2.5s            | Lighthouse              |
| INP         | <200ms           | Lighthouse              |
| CLS         | <0.1             | Lighthouse              |
| Bundle size | <200KB (initial) | webpack-bundle-analyzer |

## Anti-Patterns

| Pattern                 | Issue                     | Alternative              |
| ----------------------- | ------------------------- | ------------------------ |
| Inline functions in JSX | Re-render on every render | useCallback              |
| Large useEffect deps    | Frequent re-runs          | Split effects            |
| Unoptimized images      | Slow LCP                  | next/image, lazy loading |
| Blocking scripts        | Slow TTI                  | async/defer              |
| Large initial bundle    | Slow FCP                  | Code splitting           |

## React Optimization

| Technique      | When to Use                         | Impact     |
| -------------- | ----------------------------------- | ---------- |
| React.memo     | Pure presentational components      | Medium     |
| useMemo        | Expensive calculations              | Medium     |
| useCallback    | Callback props to memoized children | Low-Medium |
| Virtualization | Lists >100 items                    | High       |
| Lazy loading   | Routes, heavy components            | High       |

## Build Optimization

| Strategy       | Implementation                 |
| -------------- | ------------------------------ |
| Tree shaking   | ES modules, sideEffects: false |
| Code splitting | Dynamic imports, route-based   |
| Compression    | Brotli/gzip                    |
| Caching        | Content hash in filenames      |
