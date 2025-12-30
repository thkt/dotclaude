# Type Guards - Narrowing & Discriminated Unions

## Type Guards

Type guards allow TypeScript to narrow types safely at runtime.

### Type Predicate Functions

```typescript
// Good: Type predicate function
function isSuccess<T>(response: Response<T>): response is SuccessResponse<T> {
  return response.success === true
}

// Usage
if (isSuccess(response)) {
  console.log(response.data) // TypeScript knows this is SuccessResponse
}
```

### Common Type Guards

```typescript
// typeof guard
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase() // string methods available
  }
  return value.toFixed(2) // number methods available
}

// instanceof guard
function handleError(error: Error | ValidationError) {
  if (error instanceof ValidationError) {
    return error.fields // ValidationError properties available
  }
  return error.message
}

// 'in' operator guard
function getArea(shape: Circle | Rectangle) {
  if ('radius' in shape) {
    return Math.PI * shape.radius ** 2
  }
  return shape.width * shape.height
}
```

### Avoid Unsafe Assertions

```typescript
// Bad: Unsafe type assertion
if ((response as SuccessResponse).data) {
  console.log((response as SuccessResponse).data)
}

// Good: Type predicate function
if (isSuccess(response)) {
  console.log(response.data)
}
```

## Discriminated Unions

Use a common property (discriminant) to distinguish between union members.

### Basic Pattern

```typescript
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + action.payload // payload is number
    case 'DECREMENT':
      return state - action.payload
    case 'RESET':
      return 0
    default:
      // Exhaustive check
      const _exhaustive: never = action
      return state
  }
}
```

### API Response Pattern

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function handleResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data // TypeScript knows data exists
  }
  throw new Error(response.error) // TypeScript knows error exists
}
```

### Form State Pattern

```typescript
type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: FormData }
  | { status: 'error'; error: string }

function renderForm(state: FormState) {
  switch (state.status) {
    case 'idle': return <Form />
    case 'loading': return <Spinner />
    case 'success': return <SuccessMessage data={state.data} />
    case 'error': return <ErrorMessage error={state.error} />
  }
}
```

## Generic Types

Use generics for reusable, type-safe components.

### Generic Function

```typescript
// Good: Generic type preserves input type
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

const num = first([1, 2, 3])     // number | undefined
const str = first(['a', 'b'])   // string | undefined
```

### Generic Component

```typescript
// Good: Generic React component
interface SelectProps<T> {
  value: T
  options: T[]
  onChange: (value: T) => void
  getLabel?: (item: T) => string
}

function Select<T>({ value, options, onChange, getLabel }: SelectProps<T>) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const selected = options.find((opt) => String(opt) === e.target.value)
        if (selected) onChange(selected)
      }}
    >
      {options.map((option) => (
        <option key={String(option)} value={String(option)}>
          {getLabel ? getLabel(option) : String(option)}
        </option>
      ))}
    </select>
  )
}
```

### Generic Constraints

```typescript
// Good: Constrained generic
interface HasId {
  id: string | number
}

function findById<T extends HasId>(items: T[], id: T['id']): T | undefined {
  return items.find((item) => item.id === id)
}
```

## Checklist

- [ ] Type predicate functions for complex type guards
- [ ] Discriminated unions for related types
- [ ] Exhaustive checking with `never` in switch statements
- [ ] Avoid unsafe `as` assertions
- [ ] Generics for reusable components
- [ ] Generic constraints when needed
