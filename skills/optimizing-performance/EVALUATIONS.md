# Evaluations for optimizing-performance

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: performance, パフォーマンス, slow, 遅い, optimization, 最適化, rendering, レンダリング, bundle size, バンドルサイズ, Web Vitals, LCP, FID, CLS, Core Web Vitals, re-rendering, 再レンダリング, memoization, メモ化, useMemo, useCallback, React.memo, heavy, 重い, speed, 高速化, lazy loading, code splitting, tree shaking
- **Contexts**: Performance debugging, web vitals improvement, React optimization, bundle analysis

## Evaluation Scenarios

### Scenario 1: Data-Driven Analysis

```json
{
  "skills": ["optimizing-performance"],
  "query": "このページが遅い。どこから手をつけるべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '遅い' keyword",
    "Emphasizes 'Measure first, optimize later' philosophy",
    "Suggests Lighthouse or Chrome DevTools profiling first",
    "Does NOT jump to solutions without data",
    "References Core Web Vitals (LCP, FID, CLS) as targets"
  ]
}
```

### Scenario 2: React Re-render Optimization

```json
{
  "skills": ["optimizing-performance"],
  "query": "Reactコンポーネントが頻繁に再レンダリングされて重い",
  "files": ["src/components/DataGrid.tsx"],
  "expected_behavior": [
    "Skill is triggered by '再レンダリング' and '重い'",
    "Loads references/react-optimization.md section",
    "Explains React.memo, useMemo, useCallback usage",
    "Shows React DevTools Profiler usage",
    "Warns against premature memoization (YAGNI)"
  ]
}
```

### Scenario 3: Web Vitals Improvement

```json
{
  "skills": ["optimizing-performance"],
  "query": "LCPスコアが悪い。改善方法を教えて",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'LCP' keyword",
    "Loads references/web-vitals.md section",
    "Explains LCP (Largest Contentful Paint) metric",
    "Lists specific LCP optimization techniques",
    "Suggests using Chrome DevTools to identify LCP element"
  ]
}
```

### Scenario 4: Bundle Size Reduction

```json
{
  "skills": ["optimizing-performance"],
  "query": "バンドルサイズが大きすぎる。どう減らせばいい？",
  "files": ["package.json", "webpack.config.js"],
  "expected_behavior": [
    "Skill is triggered by 'バンドルサイズ'",
    "Loads references/bundle-optimization.md section",
    "Recommends bundle analyzer first (measure!)",
    "Explains code splitting and lazy loading",
    "Shows tree shaking verification methods"
  ]
}
```

### Scenario 5: Performance Review Integration

```json
{
  "skills": ["optimizing-performance"],
  "query": "/audit でパフォーマンスレビューをしたい",
  "files": ["src/pages/Dashboard.tsx"],
  "expected_behavior": [
    "Skill is triggered by '/audit' and 'パフォーマンス'",
    "Integrates with performance-reviewer agent",
    "Provides systematic performance checklist",
    "Identifies specific bottlenecks with line references",
    "Prioritizes issues by impact"
  ]
}
```

## Progressive Disclosure Verification

This skill uses section-based content. Verify correct section loading:

| Query Contains | Expected Section Loaded |
| --- | --- |
| LCP, FID, CLS, Web Vitals | references/web-vitals.md |
| React, useMemo, useCallback, re-render | references/react-optimization.md |
| bundle, code splitting, lazy | references/bundle-optimization.md |

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by performance-related keywords
- [ ] "Measure first" philosophy was emphasized (Knuth's warning)
- [ ] Appropriate reference section was loaded (Progressive Disclosure)
- [ ] Specific, actionable optimization techniques were provided
- [ ] No premature optimization advice (YAGNI respected)
- [ ] Chrome DevTools / Lighthouse usage was mentioned

## Baseline Comparison

### Without Skill

- Generic optimization advice without measurement emphasis
- May suggest optimizations without data
- Lacks systematic Web Vitals focus
- No Progressive Disclosure (all info loaded at once)

### With Skill

- Data-driven approach ("Premature optimization is evil")
- Systematic Core Web Vitals methodology
- Section-based loading reduces context usage
- Integration with performance-reviewer agent
- React-specific patterns when relevant
