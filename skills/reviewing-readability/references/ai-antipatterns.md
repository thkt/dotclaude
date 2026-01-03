# AI Code Antipatterns Detection

## Premature Abstraction

### Interface for Single Implementation

```typescript
// Bad: AI-generated: Unnecessary interface
interface UserProcessor {
  process(user: User): ProcessedUser
}

class DefaultUserProcessor implements UserProcessor {
  process(user: User): ProcessedUser {
    return { ...user, processed: true }
  }
}

// Good: Direct approach
function processUser(user: User): ProcessedUser {
  return { ...user, processed: true }
}

// Add interface only when 2nd implementation appears
```

**Red flag**: Interface with only one implementation

---

## Unnecessary Classes for Simple Tasks

### Class Wrapping Simple Function

```typescript
// Bad: AI-generated: OOP overkill
class CSVReader {
  async read(path: string): Promise<string[][]> {
    const text = await fs.readFile(path, 'utf-8')
    return this.parse(text)
  }

  private parse(text: string): string[][] {
    return text.split('\n').map(line => line.split(','))
  }
}

// Good: Procedural approach
async function readCSV(path: string): Promise<string[][]> {
  const text = await fs.readFile(path, 'utf-8')
  return text.split('\n').map(line => line.split(','))
}
```

**When to use classes**:

- Multiple related operations
- Shared state between methods
- Clear responsibility boundary

**When to use functions**:

- Single operation
- Stateless transformation
- Simple task

---

## Imagined Extensibility

### Plugin System for Simple Logic

```typescript
// Bad: AI-generated: Over-engineered validation
class ValidationEngine {
  private validators: Map<string, Validator>

  registerValidator(name: string, validator: Validator) { }
  validate(data: unknown, rules: string[]): Result { }
}

// Good: Direct validation
function validateUser(user: User): ValidationError[] {
  const errors = []
  if (!user.email) errors.push({ field: 'email', message: 'Required' })
  if (user.age < 0) errors.push({ field: 'age', message: 'Invalid' })
  return errors
}
```

**Red flag**: "Future-proof" architecture with no concrete use case

---

## Helper Functions Used Once

```typescript
// Bad: Unnecessary helper
function getUserName(user: User): string {
  return user.name
}

function displayUser(user: User) {
  console.log(getUserName(user))  // Used only once
}

// Good: Direct access
function displayUser(user: User) {
  console.log(user.name)
}
```

**Rule**: Extract helper only when used 3+ times

---

## Patterns Applied Without Problem

### Factory Pattern for Simple Creation

```typescript
// Bad: Unnecessary factory
class UserFactory {
  createUser(name: string, email: string): User {
    return { name, email, createdAt: new Date() }
  }
}

// Good: Simple function
function createUser(name: string, email: string): User {
  return { name, email, createdAt: new Date() }
}
```

### Strategy Pattern for Static Logic

```typescript
// Bad: Over-engineered
interface DiscountStrategy {
  calculate(amount: number): number
}

class RegularDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.1
  }
}

// Good: Simple conditional
function calculateDiscount(amount: number, userType: string): number {
  if (userType === 'premium') return amount * 0.2
  if (userType === 'regular') return amount * 0.1
  return 0
}
```

**Use patterns only when**:

- Multiple actual implementations exist
- Behavior needs runtime switching
- Pattern solves a real problem

---

## Detection Checklist

### Red Flags

- [ ] Interfaces with single implementation
- [ ] Classes wrapping one function
- [ ] Helper functions used exactly once
- [ ] "Future-proof" abstractions
- [ ] Design patterns without clear need
- [ ] Complex architectures for simple tasks

### Fix Strategy

1. **Apply Occam's Razor**: Delete unnecessary abstractions
2. **Start concrete**: Build what you need now
3. **Add complexity only when**:
   - Same pattern appears 3+ times (DRY principle)
   - Multiple implementations are **actually** needed
   - Current approach **measurably** fails

---

## Task Scope-Based Approach

Choose implementation based on actual scope:

```typescript
// Single function task → Direct procedural
async function uploadFile(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  return await storage.put(data)
}

// File-level logic → Functions with minimal abstraction
function validateUser(user: User) { }
function saveUser(user: User) { }

// Module-level → Consider classes when:
// - Multiple related operations
// - Shared state (connection, cache)
// - Clear responsibility boundary

// System-level → Apply patterns only when:
// - Multiple teams involved
// - Plugin system required
// - Public API surface
```

---

## The Simplicity Test

Before accepting AI-generated code:

1. **Can this be a simple function?** → Start there
2. **Is this pattern solving an actual problem?** → If no, remove it
3. **Will this code exist in 3 months?** → If yes, keep it simple

---

## Comprehension Debt Check

Before merging AI-generated code, ask:

1. **Can I explain WHY this code exists?** → Not just what it does
2. **Would I write this from scratch?** → If not, refactor it
3. **Is there simpler code achieving the same?** → Apply Occam's Razor

If NO to any → refactor or reject. Code you can't explain is a liability.

---

## Remember

> "The best code is code that doesn't need to exist yet" - Progressive Enhancement

**Principle**: Procedural vs OOP is not about preference—it's about matching solution complexity to problem complexity.
