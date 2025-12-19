# Comments & Code Clarity

## Core Principle: Why, Not What

```typescript
// ❌ What comment (redundant)
// Increment counter by 1
counter++

// ❌ What comment (obvious)
// Check if user is admin
if (user.role === 'admin') { }

// ✅ Why comment (valuable)
// Use exponential backoff to avoid overwhelming the server during retry storms
await sleep(Math.pow(2, retryCount) * 1000)

// ✅ Why comment (business context)
// Legal requirement: Data must be retained for 7 years
const DATA_RETENTION_DAYS = 7 * 365
```

---

## Code First, Comments Second

### Self-Documenting Code

```typescript
// ❌ Needs comment to explain
// Check if user can access premium features
if (u.sub && u.sub.exp > Date.now() && !u.ban) {
  // ...
}

// ✅ Code explains itself
function canAccessPremiumFeatures(user: User): boolean {
  return user.hasActiveSubscription() &&
         !user.isBanned
}

if (canAccessPremiumFeatures(user)) {
  // ...
}
```

---

## Make Code Look Like Intent

```typescript
// ❌ Intent unclear
const p = products.filter(p => p.price > 0 && p.stock)

// ✅ Intent obvious
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

---

## Update or Delete Outdated Comments

```typescript
// ❌ Outdated comment (dangerous)
// Returns user ID
function getUser() {
  return { id: 123, name: 'John', email: 'john@example.com' }  // Returns full user object now
}

// ✅ No comment needed (type says it all)
function getUser(): User {
  return { id: 123, name: 'John', email: 'john@example.com' }
}
```

**Rule**: Outdated comments are worse than no comments

---

## When Comments ARE Needed

### 1. Complex Algorithms

```typescript
// ✅ Explaining algorithm choice
// Using Boyer-Moore algorithm for faster string matching in large texts
// Time complexity: O(n/m) in best case vs O(n*m) for naive approach
function searchPattern(text: string, pattern: string) {
  // Implementation
}
```

### 2. Non-Obvious Business Rules

```typescript
// ✅ Business context
// Per legal team: Users in EU must explicitly opt-in to marketing emails (GDPR)
// Default is false, unlike other regions where it's true
const marketingOptIn = user.region === 'EU' ? false : true
```

### 3. Workarounds and Technical Debt

```typescript
// ✅ Explaining workaround
// TODO: Remove this hack once API v2 is deployed (Target: Q2 2025)
// Current API returns dates in inconsistent formats
const normalizedDate = parseFlexibleDateFormat(apiResponse.date)
```

### 4. Performance Optimizations

```typescript
// ✅ Explaining optimization
// Cache result to avoid expensive DB query on every render
// Invalidated when user settings change
const cachedUserPreferences = useMemo(() => {
  return computePreferences(user)
}, [user.settings])
```

---

## Comment Anti-Patterns

### Commented-Out Code

```typescript
// ❌ Don't keep commented code
function calculate() {
  // const oldMethod = doSomething()
  // const result = processOldWay(oldMethod)
  return newMethod()
}

// ✅ Delete it (use git history if needed)
function calculate() {
  return newMethod()
}
```

### Obvious Comments

```typescript
// ❌ Stating the obvious
// Set name to 'John'
name = 'John'

// Increment i
i++

// Return true
return true
```

### Journal Comments

```typescript
// ❌ Change log in comments
// 2024-01-05: Changed validation logic - John
// 2024-01-10: Fixed edge case - Sarah
// 2024-01-15: Refactored - Mike
function validate() { }

// ✅ Use git commit history instead
```

---

## Documentation Comments (JSDoc/TSDoc)

Use for public APIs:

```typescript
/**
 * Fetches user profile by ID
 *
 * @param userId - The unique identifier for the user
 * @returns Promise resolving to user profile or null if not found
 * @throws {ValidationError} If userId is invalid
 *
 * @example
 * const user = await getUserById('user123')
 */
async function getUserById(userId: string): Promise<User | null> {
  // Implementation
}
```

---

## The Final Test

Ask yourself:

1. **Can I delete this comment and make the code self-documenting instead?**
2. **Does this comment explain WHY, not WHAT?**
3. **Is this comment still accurate?**

If any answer is unclear, refactor the code instead of relying on comments.
