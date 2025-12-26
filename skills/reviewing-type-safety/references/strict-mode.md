# Strict Mode - TypeScript Configuration & React Types

## Strict Mode Configuration

Enable all strict mode options in `tsconfig.json` for maximum type safety.

### Recommended Configuration

```json
{
  "compilerOptions": {
    // Strict mode (enables all below)
    "strict": true,

    // Or enable individually:
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,

    // Additional safety
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

### Key Options Explained

| Option | Effect |
| --- | --- |
| `strictNullChecks` | `null` and `undefined` are distinct types |
| `noImplicitAny` | Error on implicit `any` type |
| `strictFunctionTypes` | Stricter function type checking |
| `noUncheckedIndexedAccess` | Array/object access returns `T \| undefined` |
| `useUnknownInCatchVariables` | `catch (e)` uses `unknown` instead of `any` |

### Handling Strict Null Checks

```typescript
// ❌ Error with strictNullChecks
function greet(name: string | undefined) {
  return name.toUpperCase() // Error: 'name' is possibly 'undefined'
}

// ✅ Good: Handle null/undefined
function greet(name: string | undefined) {
  if (!name) return 'Guest'
  return name.toUpperCase()
}

// ✅ Good: Non-null assertion (only when you're certain)
function greet(name: string | undefined) {
  // Only use when you KNOW it's defined
  return name!.toUpperCase()
}
```

### Handling noUncheckedIndexedAccess

```typescript
// With noUncheckedIndexedAccess: true
const arr = [1, 2, 3]
const first = arr[0] // number | undefined

// ❌ Error
console.log(first.toFixed()) // 'first' is possibly 'undefined'

// ✅ Good: Handle undefined
if (first !== undefined) {
  console.log(first.toFixed())
}

// ✅ Good: Assert when certain
console.log(arr[0]!.toFixed()) // Only when you KNOW index exists
```

## React Component Types

### Function Component

```typescript
// ❌ Poor: Loose prop types
interface ButtonProps {
  onClick?: any
  children?: any
}

// ✅ Good: Precise prop types
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

function Button({ onClick, children, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

### Extending HTML Attributes

```typescript
// ✅ Good: Extend native HTML attributes
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

function Button({ variant = 'primary', loading, children, ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

### Children Patterns

```typescript
// ✅ Good: Explicit children types
interface CardProps {
  children: React.ReactNode // Any valid JSX
}

interface ListProps<T> {
  items: T[]
  children: (item: T) => React.ReactElement // Render prop
}

interface WrapperProps {
  children: React.ReactElement // Single element only
}
```

### Event Handlers

```typescript
// ✅ Good: Typed event handlers
interface FormProps {
  onSubmit: (data: FormData) => void
}

function Form({ onSubmit }: FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Ref Types

```typescript
// ✅ Good: Typed refs
function InputWithFocus() {
  const inputRef = useRef<HTMLInputElement>(null)

  const focus = () => {
    inputRef.current?.focus() // Safe with optional chaining
  }

  return <input ref={inputRef} />
}

// ✅ Good: forwardRef with types
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
)
```

## Checklist

- [ ] `"strict": true` in tsconfig.json
- [ ] `noUncheckedIndexedAccess` enabled for array safety
- [ ] React components extend proper HTML attributes
- [ ] Event handlers properly typed
- [ ] Refs typed correctly with `useRef<Type>`
- [ ] `forwardRef` properly typed when used
- [ ] Children type matches component needs
