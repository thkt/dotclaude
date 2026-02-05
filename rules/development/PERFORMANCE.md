# Performance Guidelines

## Context Management

| Strategy   | Guideline               | Rationale                           |
| ---------- | ----------------------- | ----------------------------------- |
| MCP tools  | Enable ≤10 per project  | Prevents 200k→70k context shrinkage |
| Plugins    | Enable only needed ones | Each adds token overhead            |
| `/compact` | Use when context >70%   | Preserves conversation history      |
| `/fork`    | Use for parallel tasks  | Avoids context pollution            |

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
