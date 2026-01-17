---
name: optimizing-performance
description: >
  Frontend performance optimization with data-driven approach.
  Triggers: performance, Web Vitals, LCP, FID, CLS, パフォーマンス最適化, 速度改善, bundle size.
allowed-tools: [Read, Grep, Glob, Task, Bash(agent-browser:*), mcp__mdn__*]
agent: performance-reviewer
user-invocable: false
---

# Performance Optimization

## Core Web Vitals

| Metric | Target | Measure                  |
| ------ | ------ | ------------------------ |
| LCP    | <2.5s  | Largest Contentful Paint |
| FID    | <100ms | First Input Delay        |
| CLS    | <0.1   | Cumulative Layout Shift  |

## Workflow

1. Measure (Lighthouse/DevTools)
2. Identify bottleneck
3. One change at a time
4. Re-measure

## References

| Topic  | File                                |
| ------ | ----------------------------------- |
| Vitals | `references/web-vitals.md`          |
| React  | `references/react-optimization.md`  |
| Bundle | `references/bundle-optimization.md` |
