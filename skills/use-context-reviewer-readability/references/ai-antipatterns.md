# AI Code Antipatterns

## Red Flags

| Pattern                    | Example                                    | Fix                        |
| -------------------------- | ------------------------------------------ | -------------------------- |
| Interface, 1 impl          | `interface X { } class DefaultX impl X`    | Use function directly      |
| Class wrapping 1 function  | `class CSVReader { read() {} }`            | Simple function            |
| Helper used once           | `getUserName(u)` used in 1 place           | Inline: `user.name`        |
| Plugin system, simple task | `ValidationEngine.registerValidator()`     | Direct validation function |
| Factory for simple create  | `UserFactory.createUser()`                 | `createUser()` function    |
| Strategy, static logic     | `interface DiscountStrategy { calculate }` | Simple conditional         |

## When to Use Each

| Approach  | When                                                   |
| --------- | ------------------------------------------------------ |
| Function  | Single operation, stateless, simple task               |
| Class     | Multiple related ops, shared state, clear boundary     |
| Interface | 2+ actual implementations exist                        |
| Pattern   | Solves real problem, runtime behavior switching needed |

## Complexity Matching

| Task Scope   | Approach                             |
| ------------ | ------------------------------------ |
| Single func  | Direct procedural                    |
| File-level   | Functions with minimal abstraction   |
| Module-level | Classes when shared state needed     |
| System-level | Patterns when multiple teams/plugins |

## Code Examples

```typescript
// Bad: Unnecessary factory
class UserFactory {
  createUser(name, email) {
    return { name, email, createdAt: new Date() };
  }
}

// Good: Simple function
function createUser(name, email) {
  return { name, email, createdAt: new Date() };
}
```

```typescript
// Bad: Strategy pattern for static logic
interface DiscountStrategy {
  calculate(amount: number): number;
}
class RegularDiscount implements DiscountStrategy {
  /*...*/
}

// Good: Simple conditional
function calculateDiscount(amount, userType) {
  if (userType === "premium") return amount * 0.2;
  if (userType === "regular") return amount * 0.1;
  return 0;
}
```

## Acceptance Checklist

| Question                           | If No         |
| ---------------------------------- | ------------- |
| Can this be a simple function?     | Start there   |
| Is pattern solving actual problem? | Remove it     |
| Can I explain WHY this exists?     | Refactor      |
| Would I write this from scratch?   | Refactor      |
| Is there simpler code for same?    | Apply Occam's |

## Rule

Abstract only when:

1. Same pattern appears 3+ times (DRY)
2. Multiple implementations actually needed
3. Current approach measurably fails
