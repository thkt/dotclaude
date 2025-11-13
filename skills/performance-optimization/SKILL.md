---
description: >
  Frontend performance optimization expertise with data-driven approach. Use when addressing
  performance issues (パフォーマンス), slow pages (遅い), optimization (最適化),
  rendering problems (レンダリング), bundle size (バンドルサイズ), Web Vitals (LCP, FID, CLS),
  Core Web Vitals, re-rendering (再レンダリング), memoization (メモ化), useMemo, useCallback,
  React.memo, heavy pages (重い), speed improvements (高速化), lazy loading, code splitting,
  or tree shaking. Provides measurement-based techniques for React optimization, Web Vitals
  improvement, and bundle optimization. Essential for performance-reviewer agent.
allowed-tools: Read, Grep, Glob, Task, mcp__chrome-devtools__*, mcp__mdn__*
---

# Performance Optimization - Data-Driven Frontend Optimization

## 🎯 Core Philosophy

**"Premature optimization is the root of all evil"** - Donald Knuth

Optimize **after measuring**. Make decisions based on data, not feelings.

### What This Skill Provides

1. **Web Vitals-Based Measurement** - LCP, FID, CLS improvement techniques
2. **React Optimization Patterns** - Reducing re-renders, proper memoization usage
3. **Bundle Optimization** - Code splitting, Tree shaking, lazy loading
4. **Measurement Tools** - Chrome DevTools, Lighthouse, React DevTools

---

## 📚 Section-Based Content

This skill is organized into 3 specialized sections for efficient context usage:

### 🔍 Section 1: Web Vitals Optimization

**File**: [`references/web-vitals.md`](./references/web-vitals.md)
**Tokens**: ~500
**Focus**: Google's Core Web Vitals (LCP, FID, CLS)

**Covers**:

- Understanding Core Web Vitals metrics
- Improving LCP (Largest Contentful Paint)
- Reducing FID (First Input Delay)
- Preventing CLS (Cumulative Layout Shift)
- Chrome DevTools profiling

**When to load**: User mentions LCP, FID, CLS, Web Vitals, loading speed, layout shifts

---

### ⚛️ Section 2: React Optimization

**File**: [`references/react-optimization.md`](./references/react-optimization.md)
**Tokens**: ~800
**Focus**: React-specific performance patterns

**Covers**:

- React.memo for component memoization
- useMemo for computation caching
- useCallback for function memoization
- List virtualization
- State management optimization
- React DevTools Profiler

**When to load**: User mentions re-renders, React performance, useMemo, useCallback, React.memo

---

### 📦 Section 3: Bundle Optimization

**File**: [`references/bundle-optimization.md`](./references/bundle-optimization.md)
**Tokens**: ~600
**Focus**: Bundle size reduction and code splitting

**Covers**:

- Code splitting patterns
- Tree shaking techniques
- Image optimization
- Bundle size measurement
- Dynamic imports
- Lazy loading strategies

**When to load**: User mentions bundle size, code splitting, lazy loading, tree shaking

---

## 🔄 How Section Loading Works

### Efficient Context Usage

```typescript
// Before (Monolithic): Always load all 3000 tokens
User: "LCPが遅い"
→ Load entire skill.md (3000 tokens)

// After (Section-based): Load only relevant section
User: "LCPが遅い"
→ Load skill.md metadata (200 tokens)
→ Detect "LCP" keyword → Match to web-vitals section
→ Load references/web-vitals.md (500 tokens)
→ Total: 700 tokens (77% reduction)
```

### Loading Strategy

1. **Default**: Load metadata + Core Philosophy (~200 tokens)
2. **Keyword match**: Load specific section (~500-800 tokens)
3. **Multiple keywords**: Load multiple sections if needed
4. **Fallback**: If no specific match, suggest relevant section

---

## 💡 Usage Examples

### Example 1: LCP Optimization

```markdown
User: "ページの読み込みが遅い。LCPを改善したい"

Claude loads:
✓ skill.md metadata (200 tokens)
✓ references/web-vitals.md (500 tokens)
Total: 700 tokens

Provides:
- LCP measurement techniques
- Priority loading strategies
- Preloading techniques
- Image optimization for LCP
```

### Example 2: React Re-rendering Issues

```markdown
User: "コンポーネントが不要に再レンダリングされる"

Claude loads:
✓ skill.md metadata (200 tokens)
✓ references/react-optimization.md (800 tokens)
Total: 1000 tokens

Provides:
- React.memo usage
- useMemo patterns
- React DevTools profiling
- State separation strategies
```

### Example 3: Bundle Size Reduction

```markdown
User: "バンドルサイズが大きすぎる"

Claude loads:
✓ skill.md metadata (200 tokens)
✓ references/bundle-optimization.md (600 tokens)
Total: 800 tokens

Provides:
- Code splitting techniques
- Tree shaking patterns
- Bundle analyzer usage
- Dynamic import strategies
```

---

## 🎯 Optimization Priorities

1. **Measure First** - Always use Lighthouse, Chrome DevTools before optimizing
2. **User-Centric Metrics** - Focus on Web Vitals (LCP, FID, CLS)
3. **Progressive Enhancement** - Start simple, optimize based on data
4. **Avoid Premature Optimization** - Only optimize problematic areas

---

## ✨ Key Takeaways

1. **Measure First** - Always measure before optimizing
2. **User-Centric Metrics** - Use Web Vitals as baseline
3. **Section-based Learning** - Load only relevant knowledge
4. **Data-Driven Decisions** - Optimize based on profiling data

---

**Remember**: "Make it work, make it right, make it fast - in that order"

**For detailed information, see the specific section files listed above.**
