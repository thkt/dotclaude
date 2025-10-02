# The Art of Readable Code

**Default mindset**: Code should be easy to understand - Dustin Boswell & Trevor Foucher

## Core Philosophy

**"Code should be written to minimize the time it would take for someone else to understand it"**

- That "someone else" might be you six months later
- Understanding time > writing time

## Scientific Foundation

Miller's Law (7±2) demonstrates that human cognitive capacity is limited. When code exceeds these limits:

- Comprehension time increases exponentially
- Error rates multiply
- Mental fatigue accelerates

This scientific backing explains WHY readable code matters: our brains literally cannot process too much complexity at once.

→ See [@../reference/MILLERS_LAW.md](../reference/MILLERS_LAW.md) for the cognitive science behind readable code

## Key Practices

### 1. Making Code Easy to Understand

#### Names That Can't Be Misconstrued

```typescript
// ❌ Ambiguous
results.filter(x => x > LIMIT)  // Greater than or equal to?

// ✅ Clear intent
results.filter(x => x >= MIN_ITEMS_TO_DISPLAY)
```

#### Prefer Concrete over Abstract

```typescript
// ❌ Abstract
processData(data)

// ✅ Concrete
validateUserRegistration(formData)
```

### 2. Simplifying Loops and Logic

#### Make Control Flow Obvious

```typescript
// ❌ Complex nesting
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// ✅ Early returns
if (!user) return
if (!user.isActive) return
if (!user.hasPermission) return
// do something
```

#### Minimize Nesting

- Use guard clauses
- Extract complex conditions to well-named functions
- Prefer early returns

### 3. Reorganizing Your Code

#### Extract Unrelated Subproblems

```typescript
// ✅ Each function does one thing
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser)
}

function isActiveUser(user: User): boolean {
  return user.status === 'active' && user.lastLogin > thirtyDaysAgo()
}
```

#### One Task at a Time

- Functions should do one thing
- If explaining requires "and", split it
- Separate "what" from "how"

### 4. Code Should Be "Obviously Correct"

#### Make Your Code Look Like Your Intent

```typescript
// ❌ Intent unclear
const p = products.filter(p => p.price > 0 && p.stock)

// ✅ Intent obvious
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

### 5. Key Questions Before Writing

Ask yourself:

1. "What is the easiest way to understand this?"
2. "What would confuse someone reading this?"
3. "Can I make the intent more obvious?"

## Practical Application

### Variable Naming

- **Specific > Generic**: `userEmail` not `data`
- **Searchable**: `MAX_RETRY_COUNT` not `7`
- **Pronounceable**: `customer` not `cstmr`

### Function Design

- **Small & Focused**: 5-10 lines ideal
- **Descriptive Names**: `calculateTotalPrice()` not `calc()`
- **Consistent Level**: Don't mix high and low-level operations

### Comments

- **Why, not What**: Explain decisions, not mechanics
- **Update or Delete**: Outdated comments are worse than none
- **Code First**: If you need to explain what, rewrite the code

## The Final Test

**"Would a new team member understand this in < 1 minute?"**

If not, simplify further.

## AI Code Smells

When reviewing AI-generated code (including your own), watch for these common over-engineering patterns:

### Premature Abstraction

```typescript
// ❌ AI-generated: Interface for single implementation
interface UserProcessor {
  process(user: User): ProcessedUser
}

class DefaultUserProcessor implements UserProcessor {
  process(user: User): ProcessedUser {
    return { ...user, processed: true }
  }
}

// ✅ Direct approach: Start concrete
function processUser(user: User): ProcessedUser {
  return { ...user, processed: true }
}
// Add interface only when 2nd implementation appears
```

### Unnecessary Classes for Simple Tasks

```typescript
// ❌ AI-generated: OOP for procedural task
class CSVReader {
  async read(path: string): Promise<string[][]> {
    const text = await fs.readFile(path, 'utf-8')
    return this.parse(text)
  }

  private parse(text: string): string[][] {
    return text.split('\n').map(line => line.split(','))
  }
}

// ✅ Procedural approach: Simpler for one-off tasks
async function readCSV(path: string): Promise<string[][]> {
  const text = await fs.readFile(path, 'utf-8')
  return text.split('\n').map(line => line.split(','))
}
```

### Imagined Extensibility

```typescript
// ❌ AI-generated: Plugin system for simple validation
class ValidationEngine {
  private validators: Map<string, Validator>

  registerValidator(name: string, validator: Validator) { }
  validate(data: unknown, rules: string[]): Result { }
}

// ✅ Direct validation: Build what you need now
function validateUser(user: User): ValidationError[] {
  const errors = []
  if (!user.email) errors.push({ field: 'email', message: 'Required' })
  if (user.age < 0) errors.push({ field: 'age', message: 'Invalid' })
  return errors
}
```

### Detection & Remediation

**Red flags:**

- "Future-proof" abstractions with no concrete use case
- Classes wrapping single functions
- Patterns applied to problems they don't solve
- Helper functions used exactly once

**Fix strategy:**

1. Apply Occam's Razor - delete abstractions
2. Start with the most direct solution
3. Add complexity only when:
   - Same pattern appears 3+ times (DRY)
   - Multiple implementations are **actually** needed
   - Current approach **measurably** fails

## Remember

- Clarity beats cleverness
- Future you is a different person
- Reading happens more than writing

## Related Principles

### Scientific Foundation

- [@../reference/MILLERS_LAW.md](../reference/MILLERS_LAW.md) - Cognitive limits explain why readability matters

### Complementary Principles

- [@./LAW_OF_DEMETER.md](./LAW_OF_DEMETER.md) - Simpler interfaces improve readability
- [@./CONTAINER_PRESENTATIONAL.md](./CONTAINER_PRESENTATIONAL.md) - Clear separation improves understanding
- [@../reference/OCCAMS_RAZOR.md](../reference/OCCAMS_RAZOR.md) - Simplicity enhances readability
