# Control Flow & Complexity Management

## Minimize Nesting Depth

**Guideline**: Maximum 3 levels of nesting, ideal is 2

### Use Guard Clauses

```typescript
// ❌ Deep nesting (4 levels)
function processOrder(order) {
  if (order) {
    if (order.isValid) {
      if (order.user) {
        if (order.user.hasPermission) {
          // Process order
        }
      }
    }
  }
}

// ✅ Guard clauses (1 level)
function processOrder(order) {
  if (!order) return
  if (!order.isValid) return
  if (!order.user) return
  if (!order.user.hasPermission) return

  // Process order
}
```

### Early Returns

```typescript
// ❌ Nested if-else
function calculateDiscount(user, amount) {
  if (user.isPremium) {
    if (amount > 100) {
      return amount * 0.2
    } else {
      return amount * 0.1
    }
  } else {
    return 0
  }
}

// ✅ Early returns
function calculateDiscount(user, amount) {
  if (!user.isPremium) return 0
  if (amount > 100) return amount * 0.2
  return amount * 0.1
}
```

---

## Extract Complex Conditions

```typescript
// ❌ Complex inline condition
if (user.age >= 18 && user.hasConsent && !user.isBanned && user.country === 'US') {
  allowAccess()
}

// ✅ Extracted to well-named function
function canAccessContent(user: User): boolean {
  return user.age >= 18 &&
         user.hasConsent &&
         !user.isBanned &&
         user.country === 'US'
}

if (canAccessContent(user)) {
  allowAccess()
}
```

---

## Miller's Law Application (7±2 Limits)

### Function Parameters: Maximum 5

```typescript
// ❌ Too many parameters (8)
function createUser(
  firstName, lastName, email, phone,
  address, city, state, zipCode
) { }

// ✅ Parameter object (3 groups)
function createUser(
  identity: UserIdentity,    // firstName, lastName, email
  contact: ContactInfo,      // phone, address
  location: Location         // city, state, zipCode
) { }
```

### Conditional Branches: Maximum 5

```typescript
// ❌ Too many branches (7)
function getStatus(code) {
  if (code === 'A') return 'Active'
  if (code === 'P') return 'Pending'
  if (code === 'S') return 'Suspended'
  if (code === 'B') return 'Banned'
  if (code === 'D') return 'Deleted'
  if (code === 'I') return 'Inactive'
  if (code === 'V') return 'Verified'
}

// ✅ Use data structure
const STATUS_MAP = {
  A: 'Active',
  P: 'Pending',
  S: 'Suspended',
  B: 'Banned',
  D: 'Deleted',
  I: 'Inactive',
  V: 'Verified'
}

function getStatus(code) {
  return STATUS_MAP[code] || 'Unknown'
}
```

### Function Length: 5-15 Lines

```typescript
// ✅ Ideal function length
function validateEmail(email: string): boolean {
  if (!email) return false

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

**If > 15 lines**: Break into smaller functions

---

## Make Control Flow Obvious

### Avoid Clever Tricks

```typescript
// ❌ Clever but confusing
const result = condition ? value1 : value2 || value3 && value4

// ✅ Obvious intent
let result
if (condition) {
  result = value1
} else if (value2) {
  result = value2
} else if (value4) {
  result = value4
} else {
  result = value3
}
```

### Consistent Patterns

```typescript
// ✅ Consistent early return pattern
function processA() {
  if (!valid) return null
  // process
}

function processB() {
  if (!valid) return null  // Same pattern
  // process
}
```

---

## Cognitive Load Checklist

For each function, verify:

- [ ] Parameters ≤ 5?
- [ ] Nesting depth ≤ 3?
- [ ] Conditional branches ≤ 5?
- [ ] Function length ≤ 15 lines?
- [ ] Complex conditions extracted?
- [ ] Guard clauses used?

**If any fails**: Refactor to reduce cognitive load
