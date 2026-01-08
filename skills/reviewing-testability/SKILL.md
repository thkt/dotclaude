---
name: reviewing-testability
description: >
  Testable code design patterns for TypeScript/React applications.
  Triggers: テスタビリティ, testability, テスト可能, テストしやすい,
  モック, mock, 純粋関数, pure function, 依存性注入, dependency injection, DI,
  副作用, side effect, 副作用分離, テスト困難, hard to test.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
agent: testability-reviewer
user-invocable: false
---

# Testability Review - Test-Friendly Code Design

Target: Code that is easy to test without complex mocking or setup.

## Testability Indicators

| Indicator       | Good                    | Warning          |
| --------------- | ----------------------- | ---------------- |
| Mock complexity | Simple stubs            | Deep mock chains |
| Test setup      | < 10 lines              | > 30 lines       |
| Dependencies    | Explicit (params/props) | Hidden (imports) |
| Side effects    | Isolated                | Mixed with logic |
| State           | Predictable             | Global/mutable   |

## Section-Based Loading

| Section       | File                                 | Focus                                 | Triggers             |
| ------------- | ------------------------------------ | ------------------------------------- | -------------------- |
| DI            | `references/dependency-injection.md` | Injectable dependencies               | 依存性注入, DI, mock |
| Pure          | `references/pure-functions.md`       | Pure functions, side effect isolation | 純粋関数, 副作用     |
| Mock-Friendly | `references/mock-friendly.md`        | Interfaces, factory patterns          | モック, テスト困難   |

## Quick Checklist

### Architecture

- [ ] Dependencies are injectable (not hard-coded imports)
- [ ] Clear separation between pure and impure code
- [ ] Interfaces defined for external services

### Components

- [ ] Presentational components are pure (props in, JSX out)
- [ ] Event handlers are extractable for testing
- [ ] Side effects isolated in hooks/containers

### State Management

- [ ] No global mutable state
- [ ] State updates are predictable (reducers, pure functions)
- [ ] State can be easily initialized for tests

## Key Principles

| Principle             | Application                               |
| --------------------- | ----------------------------------------- |
| DIP (SOLID)           | Depend on abstractions, not concretions   |
| Pure Functions        | Same input = same output, no side effects |
| Explicit Dependencies | Pass dependencies as parameters           |
| Single Responsibility | One reason to test, one thing to mock     |

## Common Patterns

### Dependency Injection

```typescript
// Bad: Hard to test: Direct dependency
class UserService {
  async getUser(id: string) {
    return fetch(`/api/users/${id}`).then((r) => r.json());
  }
}

// Good: Testable: Injectable dependency
interface HttpClient {
  get<T>(url: string): Promise<T>;
}

class UserService {
  constructor(private http: HttpClient) {}
  async getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`);
  }
}
```

### Pure Functions

```typescript
// Bad: Hard to test: Side effect mixed with logic
function calculateDiscount(userId: string) {
  const history = api.getPurchaseHistory(userId); // Side effect
  return history.length > 10 ? 0.2 : 0.1;
}

// Good: Easy to test: Pure function
function calculateDiscount(purchaseCount: number): number {
  return purchaseCount > 10 ? 0.2 : 0.1;
}
```

### Presentational Components

```typescript
// Bad: Hard to test: Internal state and effects
function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  useEffect(() => { api.search(query).then(setResults) }, [query])
  return <div>...</div>
}

// Good: Easy to test: Controlled component
interface SearchBoxProps {
  query: string
  results: SearchResult[]
  onQueryChange: (query: string) => void
}

function SearchBox({ query, results, onQueryChange }: SearchBoxProps) {
  return (
    <div>
      <input value={query} onChange={e => onQueryChange(e.target.value)} />
      <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>
    </div>
  )
}
```

## References

### Core Principles

- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Dependency Inversion Principle
- [@../../skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - If hard to test, simplify

### Related Skills

- `generating-tdd-tests` - TDD process and test generation
- `reviewing-type-safety` - Types improve testability

### Used by Agents

- `testability-reviewer` - Primary consumer of this skill
