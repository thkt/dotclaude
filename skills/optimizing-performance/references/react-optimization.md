# React Performance Optimization

## Memoization Decision

| Hook          | When to Use                           | Overhead         |
| ------------- | ------------------------------------- | ---------------- |
| `React.memo`  | Expensive component, same props often | Shallow compare  |
| `useMemo`     | Expensive calculation                 | Dependency check |
| `useCallback` | Function passed to memoized child     | Dependency check |

## When to Memoize

| Criteria            | Memoize                    | Skip                  |
| ------------------- | -------------------------- | --------------------- |
| Calculation cost    | Heavy sort/filter          | `count * 2`           |
| Re-render frequency | Often with same props      | Rarely                |
| Child components    | Memoized child receives fn | No child/not memoized |

## Patterns

### React.memo

```tsx
const ExpensiveList = React.memo(({ data }: { data: Data[] }) => {
  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

### useMemo

```tsx
const sortedItems = useMemo(
  () => items.sort((a, b) => b.price - a.price),
  [items],
);
```

### useCallback

```tsx
const handleClick = useCallback(() => {
  console.log("Clicked");
}, []);
```

## List Virtualization

| List Size  | Solution                   |
| ---------- | -------------------------- |
| <100 items | Normal render              |
| 100-1000   | Consider virtualization    |
| >1000      | react-window/react-virtual |

## State Optimization

| Problem                      | Solution                           |
| ---------------------------- | ---------------------------------- |
| Global state re-renders all  | Split state by domain              |
| Object state partial updates | Separate into primitives           |
| Context re-renders consumers | Split contexts by update frequency |

## Common Pitfalls

| Pitfall                      | Fix                       |
| ---------------------------- | ------------------------- |
| Empty deps with state access | Add state to dependencies |
| Over-memoization             | Measure first             |
| Missing deps                 | Use exhaustive-deps rule  |

## Profiling

1. React DevTools → Profiler tab
2. Record → Perform actions → Stop
3. Check flame graph for unnecessary re-renders
