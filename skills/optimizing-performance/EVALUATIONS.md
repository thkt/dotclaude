# Evaluations for optimizing-performance

## Selection Criteria

Keywords and contexts that should trigger this skill:

- Keywords: performance, optimization, speed up, Web Vitals, LCP, FID, CLS, Lighthouse, slow, heavy
- Contexts: Performance analysis, optimization tasks, web vitals improvement

## Evaluation Scenarios (JSON Format - Anthropic Official Best Practices)

### Scenario 1: Basic Performance Analysis

```json
{
  "skills": ["optimizing-performance"],
  "query": "This page is slow and I want to improve it",
  "files": [],
  "expected_behavior": [
    "optimizing-performance skill is triggered",
    "Web Vitals (LCP, FID, CLS) explanation is included",
    "Measurement methods (Lighthouse, DevTools) are suggested",
    "Step-by-step improvement procedure is shown"
  ]
}
```

### Scenario 2: React Optimization

```json
{
  "skills": ["optimizing-performance"],
  "query": "React component re-renders too much",
  "files": [],
  "expected_behavior": [
    "React-specific optimization techniques are referenced",
    "Usage of useMemo, useCallback, React.memo is explained",
    "Specific code examples are provided"
  ]
}
```

### Scenario 3: Bundle Size Optimization

```json
{
  "skills": ["optimizing-performance"],
  "query": "I want to reduce bundle size",
  "files": [],
  "expected_behavior": [
    "Bundle analysis tools (webpack-bundle-analyzer, etc.) are introduced",
    "Code splitting, lazy loading techniques are explained",
    "Tree shaking verification methods are shown"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered
- [ ] Measurement-first approach emphasized
- [ ] Specific optimization techniques provided
