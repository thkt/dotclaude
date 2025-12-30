# Symptom Patterns - Common Symptom→Root Cause Mappings

## Timing & Race Conditions

### Symptom: setTimeout to wait for DOM

```typescript
// Bad: Symptom fix
useEffect(() => {
  setTimeout(() => {
    document.getElementById('modal')?.focus()
  }, 100) // Magic number, unreliable
}, [])
```

**Root Cause**: Not using React's rendering lifecycle properly

```typescript
// Good: Root cause fix
const modalRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  modalRef.current?.focus()
}, [])
```

### Symptom: Flag to prevent double execution

```typescript
// Bad: Symptom fix
let hasRun = false
function init() {
  if (hasRun) return
  hasRun = true
  // ...
}
```

**Root Cause**: Function being called multiple times due to React StrictMode or improper effect cleanup

```typescript
// Good: Root cause fix
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()
}, [])
```

## State Management

### Symptom: Multiple effects to sync state

```typescript
// Bad: Symptom fix
const [items, setItems] = useState([])
const [filteredItems, setFilteredItems] = useState([])
const [count, setCount] = useState(0)

useEffect(() => {
  setFilteredItems(items.filter(i => i.active))
}, [items])

useEffect(() => {
  setCount(filteredItems.length)
}, [filteredItems])
```

**Root Cause**: Treating derived state as independent state

```typescript
// Good: Root cause fix
const [items, setItems] = useState([])
const filteredItems = useMemo(() => items.filter(i => i.active), [items])
const count = filteredItems.length
```

### Symptom: useEffect to update state after prop change

```typescript
// Bad: Symptom fix
function Component({ value }) {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value) // Sync prop to state
  }, [value])
}
```

**Root Cause**: Unnecessary internal state that mirrors props

```typescript
// Good: Root cause fix - Use prop directly
function Component({ value }) {
  // Just use value directly, no state needed
}

// Or if transformation needed
function Component({ value }) {
  const transformedValue = useMemo(() => transform(value), [value])
}
```

## Component Communication

### Symptom: Ref to access child state/methods

```typescript
// Bad: Symptom fix
const childRef = useRef()
function handleSubmit() {
  const value = childRef.current.getValue()
  submit(value)
}
```

**Root Cause**: Improper data flow (child should report state up)

```typescript
// Good: Root cause fix
const [value, setValue] = useState('')
function handleSubmit() {
  submit(value)
}
return <Child value={value} onChange={setValue} />
```

### Symptom: Event bus or global state for sibling communication

```typescript
// Bad: Symptom fix
// Component A
eventBus.emit('dataChanged', data)

// Component B
useEffect(() => {
  eventBus.on('dataChanged', handleData)
  return () => eventBus.off('dataChanged', handleData)
}, [])
```

**Root Cause**: State should be lifted to common parent

```typescript
// Good: Root cause fix
function Parent() {
  const [data, setData] = useState()
  return (
    <>
      <ComponentA onDataChange={setData} />
      <ComponentB data={data} />
    </>
  )
}
```

## Performance

### Symptom: Memoizing everything

```typescript
// Bad: Symptom fix
const value = useMemo(() => a + b, [a, b]) // Memoizing simple addition
const callback = useCallback(() => {}, []) // Memoizing for no reason
```

**Root Cause**: Premature optimization without profiling

```typescript
// Good: Root cause fix
const value = a + b // Simple calculation, no memo needed
// Only memoize when:
// 1. Profiler shows it's slow
// 2. Passing to memoized child
// 3. Used in dependency array
```

### Symptom: Throttle/debounce everywhere

```typescript
// Bad: Symptom fix
const handleScroll = useMemo(
  () => throttle(() => updatePosition(), 100),
  []
)
```

**Root Cause**: Often the underlying approach is wrong

```typescript
// Good: Root cause fix - Use CSS or proper event
// CSS: position: sticky
// IntersectionObserver instead of scroll listener
// requestAnimationFrame for animations
```

## JavaScript for CSS Tasks

### Symptom: JavaScript for show/hide

```typescript
// Bad: Symptom fix
const [isVisible, setIsVisible] = useState(false)
return (
  <>
    <button onClick={() => setIsVisible(!isVisible)}>Toggle</button>
    {isVisible && <div>Content</div>}
  </>
)
```

**Root Cause**: CSS can handle simple show/hide

```tsx
// Good: Root cause fix
<details>
  <summary>Toggle</summary>
  <div>Content</div>
</details>

// Or CSS
.toggle:checked ~ .content { display: block; }
```

## Decision Framework

When you see a symptom fix, ask:

1. **Can this be prevented entirely?** (Better design)
2. **Can simpler technology solve this?** (HTML/CSS first)
3. **Is this treating cause or effect?** (5 Whys)
4. **Will this fix scale?** (Or will it need more patches)
5. **Is this the React/framework way?** (Use patterns correctly)
