# Evaluations for applying-frontend-patterns

## Selection Criteria

Keywords and contexts that should trigger this skill:

- **Keywords**: React, component, コンポーネント, pattern, パターン, hooks, custom hook, カスタムフック, container, presentational, 分離, state management, 状態管理, composition, HOC, render props, useEffect, useMemo, useCallback
- **Contexts**: Component design, React development, frontend architecture, pattern review

## Evaluation Scenarios

### Scenario 1: Container/Presentational Separation

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "このコンポーネントのロジックとUIを分離したい",
  "files": ["src/components/UserList.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'コンポーネント' and '分離'",
    "Explains Container/Presentational pattern",
    "Identifies logic (Container) and UI (Presentational) parts",
    "Provides refactoring example",
    "Shows Law of Demeter compliance benefits"
  ]
}
```

### Scenario 2: Custom Hook Design

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "データフェッチのロジックをカスタムフックに切り出したい",
  "files": ["src/components/Dashboard.tsx"],
  "expected_behavior": [
    "Skill is triggered by 'カスタムフック'",
    "Provides custom hook naming convention (use~ prefix)",
    "Shows data fetching hook pattern",
    "Includes loading/error state handling",
    "Demonstrates hook composition"
  ]
}
```

### Scenario 3: useMemo/useCallback Decision

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "useMemoとuseCallbackをどこで使うべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'useMemo' and 'useCallback'",
    "Explains when to use each hook",
    "Warns against premature optimization (YAGNI)",
    "Shows performance measurement approach",
    "Provides clear decision criteria"
  ]
}
```

### Scenario 4: State Management Strategy

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "状態管理をどう設計すべき？Contextを使うべき？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by '状態管理' and 'Context'",
    "Explains state location decision (local vs global)",
    "Shows Context vs props drilling trade-offs",
    "Recommends lifting state vs Context",
    "Warns against Context overuse"
  ]
}
```

### Scenario 5: Component Composition

```json
{
  "skills": ["applying-frontend-patterns"],
  "query": "コンポーネントの再利用性を高めるパターンは？",
  "files": [],
  "expected_behavior": [
    "Skill is triggered by 'コンポーネント' and '再利用'",
    "Explains composition patterns (children, render props, HOC)",
    "Recommends composition over inheritance",
    "Shows compound components pattern",
    "Applies Miller's Law (7±2) to props count"
  ]
}
```

## Manual Verification Checklist

After running each scenario:

- [ ] Skill was correctly triggered by frontend pattern keywords
- [ ] Framework-agnostic concepts explained with React examples
- [ ] Container/Presentational pattern applied when relevant
- [ ] Miller's Law (7±2) referenced for component complexity
- [ ] YAGNI principle applied to optimization decisions
- [ ] Law of Demeter referenced for component coupling

## Baseline Comparison

### Without Skill

- Generic React advice
- May miss pattern trade-offs
- No systematic approach to component design
- Lacks cognitive load consideration

### With Skill

- Structured pattern recommendations
- Container/Presentational separation guidance
- Custom hook design patterns
- Miller's Law for complexity limits
- YAGNI for optimization decisions
