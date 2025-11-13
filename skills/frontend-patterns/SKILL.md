---
name: frontend-patterns
description: >
  Framework-agnostic frontend component design patterns with rich React implementation examples.
  Use when working with React, Vue, or Angular components (コンポーネント), discussing patterns
  (パターン), hooks or custom hooks (カスタムフック), container/presentational separation (分離),
  state management (状態管理), composition, HOC, render props, or frontend architecture.
  Covers Container/Presentational separation, React Hooks patterns (useEffect, useMemo, useCallback),
  custom hooks design, state management strategies, and component composition.
  Essential for design-pattern-reviewer agent and frontend implementations.
allowed-tools: Read, Grep, Glob, Task
---

# Frontend Patterns - Component Design Guide

## Overview

Framework-agnostic component design patterns with emphasis on React implementations. Covers:

1. **Container/Presentational** - Logic/UI separation (universal pattern)
2. **Hooks Patterns** - useEffect, useMemo, useCallback best practices (React-specific)
3. **Custom Hooks** - Logic reuse and design patterns (React-specific)
4. **State Management** - Context, props, and state organization (universal concepts, React examples)
5. **Component Composition** - children, render props, HOC (universal patterns)

## When to Use This Skill

### Automatic Triggers

Keywords that activate this skill:

- React, component, コンポーネント
- pattern, パターン, design
- hooks, custom hook, カスタムフック
- container, presentational, 分離
- state management, 状態管理
- composition, HOC, render props

### Explicit Invocation

For guaranteed activation:

- "Apply frontend patterns skill"
- "Use component design patterns"
- "Show React patterns"

### Common Scenarios

- Designing component architecture
- Implementing with `/code` command
- Reviewing with `design-pattern-reviewer` agent
- Refactoring component structure
- Learning best practices for React/Vue/Angular

## Core Patterns

### 1. Container/Presentational Pattern

**Concept** (Framework-agnostic):
Separate logic (data fetching, state) from UI (presentation).

**Benefits**:

- UI components are reusable
- Easy to test separately
- Clear separation of concerns

**React Implementation**:

```tsx
// ❌ Avoid: Mixed concerns
export const UserProfile = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/user').then(setUser)
  }, [])
  return <div>{user?.name}</div>
}

// ✅ Good: Separated
// Container (logic)
export const UserProfileContainer = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/user').then(setUser)
  }, [])
  return <UserProfile user={user} />
}

// Presentational (UI only)
export const UserProfile = ({ user }) => (
  <div>{user?.name}</div>
)
```

**Vue Implementation** (for reference):

```vue
<!-- Container -->
<script setup>
import { ref, onMounted } from 'vue'
const user = ref(null)
onMounted(() => fetch('/api/user').then(u => user.value = u))
</script>

<!-- Presentational -->
<script setup>
defineProps(['user'])
</script>
<template><div>{{ user?.name }}</div></template>
```

### 2. Hooks Patterns (React-Specific)

**useEffect Dependencies**:

```tsx
// ❌ Avoid: Missing dependencies
useEffect(() => {
  fetchData(userId)
}, []) // Missing userId

// ✅ Good: Complete dependencies
useEffect(() => {
  fetchData(userId)
}, [userId])
```

**useMemo for Expensive Computations**:

```tsx
// ❌ Avoid: Recalculated every render
const filtered = items.filter(item => item.active)

// ✅ Good: Memoized
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
)
```

**useCallback for Stable Functions**:

```tsx
// ❌ Avoid: New function every render
<Child onClick={() => handleClick(id)} />

// ✅ Good: Stable reference
const handleClickCallback = useCallback(
  () => handleClick(id),
  [id]
)
<Child onClick={handleClickCallback} />
```

### 3. Custom Hooks Design (React-Specific)

**Naming Convention**: Always start with `use`

```tsx
// ✅ Good: Reusable data fetching
function useFetchUser(userId) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(setUser)
      .finally(() => setLoading(false))
  }, [userId])

  return { user, loading }
}

// Usage
const { user, loading } = useFetchUser(userId)
```

### 4. State Management

**Concept** (Universal):

- **Local state**: Component-specific data
- **Shared state**: Data used across components
- **Global state**: Application-wide data

**React Implementation**:

```tsx
// Local state (useState)
const [count, setCount] = useState(0)

// Shared state (Context)
const ThemeContext = createContext()
// Provider
<ThemeContext.Provider value={theme}>

// Global state (Context + custom hook)
function useAuth() {
  const context = useContext(AuthContext)
  return context
}
```

**State Granularity**:

```tsx
// ❌ Avoid: Large state object
const [state, setState] = useState({
  user, posts, comments, settings
})

// ✅ Good: Separate state
const [user, setUser] = useState()
const [posts, setPosts] = useState()
const [comments, setComments] = useState()
```

### 5. Component Composition

**Concept** (Universal):
Build complex components from simple ones.

**React Patterns**:

```tsx
// 1. Children pattern
const Card = ({ children }) => (
  <div className="card">{children}</div>
)

// 2. Render props
const DataProvider = ({ render, data }) => (
  <div>{render(data)}</div>
)

// 3. HOC (Higher-Order Component)
const withAuth = (Component) => (props) => {
  const user = useAuth()
  return user ? <Component {...props} /> : <Login />
}
```

## Detailed Knowledge Base

### Reference Documents

- **[@./references/container-presentational.md]** - Complete Container/Presentational pattern guide with style responsibilities

## Integration Points

### With Agents

- **design-pattern-reviewer** - Reviews React/frontend patterns using this skill's principles
- **root-cause-reviewer** - Identifies architectural issues

### With Commands

- **/code** - Applies patterns during implementation
- **/review** - Validates pattern usage

### Integration Method

```yaml
# In agent YAML frontmatter
dependencies: [frontend-patterns]
```

Or explicit reference:

```markdown
[@~/.claude/skills/frontend-patterns/SKILL.md]
```

## Quick Start

### For New Component

1. **Start Presentational** - UI only, props-driven
2. **Add Container** - Wrap with logic when needed
3. **Extract Hooks** - Reusable logic → custom hooks
4. **Optimize** - useMemo/useCallback for performance

### For Refactoring

1. **Identify mixed concerns** - Logic + UI in same component
2. **Separate Container/Presentational**
3. **Extract custom hooks** - Shared logic
4. **Simplify state** - Split large state objects

### For Code Review

1. **Check separation** - Container vs Presentational
2. **Verify hooks** - Dependencies, memoization
3. **Evaluate composition** - Reusability, flexibility
4. **Assess state** - Granularity, management strategy

## Best Practices

### Do's ✅

- Separate logic from UI (Container/Presentational)
- Use custom hooks for reusable logic
- Complete dependency arrays in useEffect
- Memoize expensive computations
- Stable callback references for child props
- Props-only Presentational components

### Don'ts ❌

- Mix data fetching with UI
- Inline functions in JSX (breaks memoization)
- Large monolithic components
- Missing useEffect dependencies
- Premature optimization (measure first)
- Global state for local concerns

## Framework Comparison

| Pattern | React | Vue | Angular |
|---------|-------|-----|---------|
| **Container/Presentational** | Separate components | Composition API | Smart/Dumb components |
| **State** | useState, Context | ref, reactive | Services, RxJS |
| **Effects** | useEffect | onMounted, watch | ngOnInit, rxjs |
| **Composition** | children, render props | slots, scoped slots | ng-content, directives |

**Key Insight**: Patterns are universal, implementations differ.

## When NOT to Use

Skip complex patterns for:

- Simple, one-off components
- Prototypes and experiments
- Components without reuse
- Over-abstraction (YAGNI)

**Rule**: Measure complexity. Add patterns when pain is felt, not anticipated.

## Success Metrics

Patterns are working when:

- Components are easily testable
- UI components reuse across projects
- Logic is shareable via custom hooks
- Refactoring doesn't break unrelated code
- New team members understand structure quickly

## Resources

### references/

- `container-presentational.md` - Detailed Container/Presentational guide

### scripts/

Currently empty (knowledge-only skill)

### assets/

Currently empty (knowledge-only skill)
