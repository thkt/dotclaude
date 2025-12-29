---
name: optimizing-performance
description: >
  Frontend performance optimization with data-driven approach. Triggers: パフォーマンス,
  遅い, 最適化, レンダリング, バンドルサイズ, Web Vitals, LCP, FID, CLS, 再レンダリング,
  メモ化, useMemo, useCallback, React.memo, 重い, 高速化, lazy loading, code splitting
allowed-tools: Read, Grep, Glob, Task, mcp__claude-in-chrome__*, mcp__mdn__*
---

# Performance Optimization

## Purpose

Data-driven frontend optimization. **"Measure before optimizing"** - Donald Knuth

## Section-Based Loading

| Section | File | Focus | Load When |
| --- | --- | --- | --- |
| Web Vitals | `references/web-vitals.md` | LCP, FID, CLS | Loading speed, layout shifts |
| React | `references/react-optimization.md` | memo, useMemo, useCallback | Re-renders |
| Bundle | `references/bundle-optimization.md` | Code splitting, tree shaking | Bundle size |

## Core Web Vitals Targets

| Metric | Target | What It Measures |
| --- | --- | --- |
| LCP | <2.5s | Largest Contentful Paint |
| FID | <100ms | First Input Delay |
| CLS | <0.1 | Cumulative Layout Shift |

## Optimization Workflow

```markdown
- [ ] 1. 現状測定（Lighthouse/DevTools）
- [ ] 2. ボトルネック特定（Network/Performance tab）
- [ ] 3. 優先順位付け（Impact vs Effort）
- [ ] 4. 改善実施（one change at a time）
- [ ] 5. 再測定・比較
```

## Priority Order

1. **Measure First** - Lighthouse, Chrome DevTools
2. **User-Centric Metrics** - Focus on Web Vitals
3. **Progressive Enhancement** - Optimize based on data
4. **Avoid Premature Optimization** - Only optimize problem areas

## Detailed References

| Reference | Purpose |
| --- | --- |
| [@./references/web-vitals.md](./references/web-vitals.md) | LCP, FID, CLS optimization |
| [@./references/react-optimization.md](./references/react-optimization.md) | memo, useMemo, useCallback |
| [@./references/bundle-optimization.md](./references/bundle-optimization.md) | Code splitting, tree shaking |

## References

### Principles (rules/)

- [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) - Avoid premature optimization

### Related Skills

- `enhancing-progressively` - CSS-first progressive enhancement
- `applying-code-principles` - SOLID, DRY, YAGNI principles

### Used by Agents

- `performance-reviewer` - Performance code review agent
