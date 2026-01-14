---
name: optimizing-performance
description: Frontend performance optimization with data-driven approach.
allowed-tools: [Read, Grep, Glob, Task, mcp__claude-in-chrome__*, mcp__mdn__*]
agent: performance-reviewer
user-invocable: false
---

# Performance Optimization

Data-driven frontend optimization. "Measure before optimizing" - Knuth

## Section-Based Loading

| Section    | File                                | Focus          |
| ---------- | ----------------------------------- | -------------- |
| Web Vitals | `references/web-vitals.md`          | LCP, FID, CLS  |
| React      | `references/react-optimization.md`  | memo, useMemo  |
| Bundle     | `references/bundle-optimization.md` | Code splitting |

## Core Web Vitals Targets

| Metric | Target | What It Measures         |
| ------ | ------ | ------------------------ |
| LCP    | <2.5s  | Largest Contentful Paint |
| FID    | <100ms | First Input Delay        |
| CLS    | <0.1   | Cumulative Layout Shift  |

## Workflow

1. Measure (Lighthouse/DevTools)
2. Identify bottleneck
3. Prioritize (Impact vs Effort)
4. One change at a time
5. Re-measure

## Priority Order

1. **Measure First** - Don't optimize blindly
2. **User-Centric** - Focus on Web Vitals
3. **Progressive** - Optimize based on data
4. **Avoid Premature** - Only problem areas
