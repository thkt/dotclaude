# Result Type Error Handling

**Core principle**: Make error handling requirements explicit through types and linting

## Core Philosophy

Error handling omissions are one of the most common bugs in frontend development. Rather than relying on code review or human attention, **enforce handling through type system and static analysis**.

Inspired by: [Result型とESLintでエラーハンドリング漏れを検出する](https://zenn.dev/knowledgework/articles/7ff389c5fe8f06)

## Result Type Pattern

### Three-Pattern Classification

| Type | Meaning | Caller Responsibility |
| --- | --- | --- |
| `Ok<T>` | Success | Use the value |
| `Err<Error>` | Failure - handling required | **Must handle explicitly** |
| `Err<null>` | Failure - already handled internally | Optional handling |

### Implementation Example

```typescript
// Type definitions
type Ok<T> = { ok: true; value: T }
type Err<E> = { ok: false; error: E }
type Result<T, E> = Ok<T> | Err<E>

// Helper functions
const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
const err = <E>(error: E): Err<E> => ({ ok: false, error })
```

### Usage Pattern

```typescript
// Usecase layer returns Result type
async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const user = await api.getUser(id)
    return ok(user)
  } catch (e) {
    return err(new ApiError('Failed to fetch user', e))
  }
}

// Caller MUST handle the error
const result = await fetchUser(userId)
if (!result.ok) {
  // ESLint enforces this block exists
  showErrorToast(result.error.message)
  return
}
// result.value is now safely typed as User
```

## Enforcement with Linting

### ESLint Configuration

Using `eslint-plugin-return-type` for enforcement:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['return-type'],
  rules: {
    'return-type/enforce-access': ['error', {
      // Regex pattern for types requiring access
      targetTypePattern: 'Err<(?!null)[^>]+>',
      // Properties that satisfy the access requirement
      accessProperties: ['error', 'ok']
    }]
  }
}
```

### Biome Configuration

Biome doesn't have a direct equivalent, but alternative approaches:

```jsonc
// biome.json
{
  "linter": {
    "rules": {
      "suspicious": {
        // Catch unused variables (including unhandled Results)
        "noUnusedVariables": "error"
      },
      "correctness": {
        // Catch floating promises
        "noVoid": "error"
      }
    }
  }
}
```

**Note**: For full Result type enforcement with Biome, consider:

1. Custom lint rules (if Biome supports)
2. TypeScript strict mode with exhaustive checks
3. Combining with `@typescript-eslint/no-floating-promises`

### TypeScript Strict Approach

Without custom lint rules, use TypeScript's type system:

```typescript
// Force exhaustive handling with never type
function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x)
}

function handleResult<T>(result: Result<T, Error>): T {
  if (result.ok) {
    return result.value
  }
  // Must handle error case - TypeScript enforces this
  throw result.error
}
```

## Integration with Error Boundaries

### React Error Boundary Pattern

```tsx
// Result type works well with Error Boundaries
function UserProfile({ userId }: { userId: string }) {
  const result = useUserQuery(userId)

  if (!result.ok) {
    // Explicit error handling - not silent
    return <ErrorDisplay error={result.error} />
  }

  return <ProfileCard user={result.value} />
}
```

## When to Apply

| Scenario | Approach |
| --- | --- |
| API calls | Always use Result type |
| Form validation | Result with validation errors |
| File operations | Result with IO errors |
| Internal utilities | Simple throw/catch may suffice |

## Benefits

1. **Compile-time safety**: Errors can't be forgotten
2. **Self-documenting**: Return type shows error possibility
3. **Explicit handling**: No hidden try-catch needed at call site
4. **Testable**: Error paths are first-class citizens

## Project-Specific Configuration

Each project should define:

1. **Result type location**: Where types are defined
2. **Lint tool**: ESLint, Biome, or TypeScript-only
3. **Enforcement level**: Warning vs Error
4. **Excluded patterns**: Internal utilities, tests, etc.

Example project config (`.claude/rules/error-handling.md`):

```markdown
## Error Handling Rules

- Result type: `@/types/result`
- Linter: ESLint with `eslint-plugin-return-type`
- Layer: Usecase and API layers only
- Excluded: Internal helpers, test utilities
```

## Related Principles

- [@./COMPLETION_CRITERIA.md](./COMPLETION_CRITERIA.md) - Quality gates include error handling
- [@../../agents/reviewers/silent-failure.md](../../agents/reviewers/silent-failure.md) - Detects silent failures
- [@../../skills/reviewing-silent-failures/SKILL.md](../../skills/reviewing-silent-failures/SKILL.md) - Silent failure patterns
