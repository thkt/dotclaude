# Strict Mode

## tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Key Options

| Option                       | Effect                                |
| ---------------------------- | ------------------------------------- |
| `strictNullChecks`           | `null`/`undefined` are distinct types |
| `noImplicitAny`              | Error on implicit `any`               |
| `noUncheckedIndexedAccess`   | Array access returns `T \| undefined` |
| `useUnknownInCatchVariables` | `catch (e)` is `unknown` not `any`    |

## Handling Patterns

### Null Checks

```typescript
// Handle undefined
function greet(name?: string) {
  if (!name) return "Guest";
  return name.toUpperCase();
}
```

### Array Access

```typescript
const arr = [1, 2, 3];
const first = arr[0]; // number | undefined
if (first !== undefined) {
  console.log(first.toFixed());
}
```

## React Component Types

| Type                        | Use For         |
| --------------------------- | --------------- |
| `React.ReactNode`           | Any JSX content |
| `React.ReactElement`        | Single element  |
| `(item: T) => ReactElement` | Render prop     |

### Props Pattern

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}
```

### Ref Pattern

```typescript
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus(); // Safe with optional chaining
```

## Checklist

| Check        | Requirement                        |
| ------------ | ---------------------------------- |
| tsconfig     | `"strict": true`                   |
| Array safety | `noUncheckedIndexedAccess` enabled |
| Components   | Extend proper HTML attributes      |
| Refs         | Typed with `useRef<Type>`          |
