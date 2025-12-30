# React Performance Optimization

## Preventing Unnecessary Re-renders

### React.memo - Component Memoization

```tsx
// Bad: Re-renders every time parent re-renders
function ExpensiveComponent({ data }: { data: Data }) {
  // Heavy calculation
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
}

// Good: No re-render unless props change
const ExpensiveComponent = React.memo(({ data }: { data: Data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
});

// Good: Custom comparison function (when deep comparison needed)
const ExpensiveComponent = React.memo(
  ({ data }: { data: Data }) => {
    const result = expensiveCalculation(data);
    return <div>{result}</div>;
  },
  (prevProps, nextProps) => {
    // Return true to skip re-render
    return prevProps.data.id === nextProps.data.id;
  }
);
```

### useMemo - Computation Memoization

```tsx
// Bad: Calculation runs every time
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = products.sort((a, b) => b.price - a.price);
  // Sorting runs every time parent re-renders

  return <ul>{sortedProducts.map(...)}</ul>;
}

// Good: No calculation unless products change
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => b.price - a.price),
    [products]  // Dependency array
  );

  return <ul>{sortedProducts.map(...)}</ul>;
}

// ⚠️ Don't overuse: Unnecessary for light calculations
// Bad: Over-optimization
const doubled = useMemo(() => count * 2, [count]);  // Unnecessary

// Good: Direct calculation
const doubled = count * 2;
```

### useCallback - Function Memoization

```tsx
// Bad: New function created every time
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked');
  };

  // Child re-renders even with React.memo (new function every time)
  return <Child onClick={handleClick} />;
}

// Good: Reuse function
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);  // Empty dependency array = created once

  return <Child onClick={handleClick} />;
}

// Good: With state
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]);  // Recreate when count changes

  return <Child onClick={handleClick} />;
}
```

---

## 📜 List Rendering Optimization

### Virtualization

```tsx
// Bad: Inefficient: Rendering all items
function LargeList({ items }: { items: Item[] }) {
  return (
    <div style={{ height: '500px', overflow: 'auto' }}>
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}
// 10,000 items = heavy initial render

// Good: Virtualization: Render only visible items
import { FixedSizeList } from 'react-window';

function LargeList({ items }: { items: Item[] }) {
  return (
    <FixedSizeList
      height={500}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ItemComponent item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
// Fast even with 10,000 items
```

---

## State Management Optimization

### State Separation

```tsx
// Bad: Global state causes entire app to re-render
function App() {
  const [user, setUser] = useState({ name: '', cart: [] });

  return (
    <>
      <Header user={user} />  {/* Only uses name */}
      <Cart items={user.cart} />  {/* Only uses cart */}
    </>
  );
}
// user.cart changes → Header also re-renders

// Good: Separate state
function App() {
  const [userName, setUserName] = useState('');
  const [cart, setCart] = useState([]);

  return (
    <>
      <Header userName={userName} />  {/* No re-render on cart change */}
      <Cart items={cart} />
    </>
  );
}
```

---

## React DevTools Profiler

### Profiling Component Performance

```tsx
// Wrap profiling target
import { Profiler } from 'react';

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Component />
    </Profiler>
  );
}

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log(`${id} took ${actualDuration}ms to render`);
}

// Check in React DevTools
// 1. DevTools → Profiler tab
// 2. Click 🔴 Record button
// 3. Perform actions
// 4. Check re-renders in Flame graph
```

---

## React Optimization Checklist

### Rendering Optimization

- [ ] `React.memo` for expensive components
- [ ] `useMemo` for computation-heavy operations
- [ ] `useCallback` for functions passed to children
- [ ] Virtualization for long lists (react-window)
- [ ] Properly separate state

### Profiling & Debugging

- [ ] Regular profiling with React DevTools
- [ ] Check unnecessary re-renders
- [ ] Measure component render time
- [ ] Identify expensive operations

---

## Key Takeaways

1. **React.memo**: Prevent unnecessary component re-renders
2. **useMemo**: Cache expensive calculations
3. **useCallback**: Prevent function recreation
4. **Virtualization**: Render only visible items in long lists
5. **State separation**: Prevent cascading re-renders
6. **Measure first**: Use React DevTools Profiler before optimizing

---

## Common Pitfalls

### Over-optimization

```tsx
// Bad: Unnecessary memoization
const doubled = useMemo(() => count * 2, [count]);  // Overhead > benefit

// Good: Direct calculation
const doubled = count * 2;
```

### Missing Dependencies

```tsx
// Bad: Stale closure
const handleClick = useCallback(() => {
  console.log(count);  // Always logs 0
}, []);  // Missing count dependency

// Good: Correct dependencies
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);
```

### Memoizing everything

```tsx
// Bad: Over-engineering
const MyComponent = React.memo(() => {
  const value1 = useMemo(() => prop1 + 1, [prop1]);
  const value2 = useMemo(() => prop2 * 2, [prop2]);
  const value3 = useMemo(() => prop3 - 1, [prop3]);
  // ... too much memoization

  return <div>{value1} {value2} {value3}</div>;
});

// Good: Only memoize expensive operations
const MyComponent = React.memo(() => {
  const expensiveValue = useMemo(
    () => performHeavyCalculation(data),
    [data]
  );  // Only this needs memoization

  return <div>{expensiveValue}</div>;
});
```

---

## Decision Framework

**When to use React.memo?**

- Component renders often with same props
- Rendering is expensive (complex UI or calculations)
- Parent re-renders frequently

**When to use useMemo?**

- Calculation is computationally expensive
- Result is used in render or as dependency
- Profiling shows performance issue

**When to use useCallback?**

- Function is passed as prop to memoized child
- Function is used as dependency in useEffect/useMemo
- Preventing unnecessary re-renders is critical

**Remember**: Premature optimization is the root of all evil. Measure first, optimize second.
