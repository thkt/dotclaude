# Law of Demeter - The Principle of Least Knowledge

**Core principle**: "Only talk to your immediate friends"

## Core Philosophy

An object should only interact with:

- **Itself** - Its own methods and properties
- **Parameters** - Objects passed as arguments
- **Created objects** - Objects it creates
- **Direct components** - Its direct properties
- **Global objects** - In limited, well-defined cases

## The Problem It Solves

```typescript
// ❌ Train wreck - violates Law of Demeter
const street = user.getAddress().getCity().getStreet().getName()
if (order.getCustomer().getPaymentMethod().isValid()) {
  order.getCustomer().getPaymentMethod().charge(amount)
}

// ✅ Direct interaction only
const street = user.getStreetName()
if (order.canCharge()) {
  order.charge(amount)
}
```

Issues solved:

- **High coupling** - Code knows too much
- **Brittle code** - Changes cascade
- **Hard to test** - Complex mocks needed
- **Poor encapsulation** - Internals exposed

## Key Techniques

### 1. Tell, Don't Ask

```typescript
// ❌ Asking for data to make decisions
if (employee.getDepartment().getBudget() > amount) {
  employee.getDepartment().getBudget().subtract(amount)
}

// ✅ Tell the object what to do
if (employee.canExpense(amount)) {
  employee.expense(amount)
}
```

### 2. Hide Delegate

```typescript
// ❌ Exposing internal structure
class Order {
  getCustomer(): Customer { return this.customer }
}
// Usage: order.getCustomer().getName()

// ✅ Hide the delegation
class Order {
  getCustomerName(): string {
    return this.customer.getName()
  }
}
// Usage: order.getCustomerName()
```

## Practical Application

### React Components

```tsx
// ❌ Component knows too much
function UserCard({ user }) {
  return <h2>{user.profile.info.name.displayName}</h2>
}

// ✅ Component receives what it needs
function UserCard({ displayName }) {
  return <h2>{displayName}</h2>
}

// Parent handles extraction
function UserCardContainer({ user }) {
  return <UserCard displayName={user.getDisplayName()} />
}
```

### API Design

```typescript
// ❌ Exposing internal structure
class BankAccount {
  getTransactions(): Transaction[] {
    return this.transactions
  }
}

// ✅ Provide specific methods
class BankAccount {
  getTransactionsAbove(amount: number): Transaction[] {
    return this.transactions.filter(t => t.amount > amount)
  }
}
```

### Testing Benefits

```typescript
// ❌ Complex mocking
const mockCity = { getTaxRate: jest.fn(() => 0.08) }
const mockAddress = { getCity: jest.fn(() => mockCity) }
const mockCustomer = { getAddress: jest.fn(() => mockAddress) }

// ✅ Simple interface
const mockCustomer = { getTaxRate: jest.fn(() => 0.08) }
```

## Exceptions

### When It's OK to Violate

**Fluent interfaces** - Designed for chaining:

```typescript
query.select('*').from('users').where('active', true).limit(10)
```

Also acceptable:

- Builder patterns
- Data transformation pipelines (map/filter/reduce)

## Guidelines for Application

### Code Review Checklist

- [ ] No method chains longer than 2-3 calls
- [ ] Components receive specific props, not entire objects
- [ ] No reaching through objects to get data
- [ ] Tell, don't ask principle applied
- [ ] Test setup is simple, not deeply nested

### Refactoring Signals

Look for:

- `getX().getY().getZ()` patterns
- Complex mock setups in tests
- Frequent null checks in chains
- Changes that break unrelated code

## Remember

> "Each unit should have only limited knowledge about other units: only units 'closely' related to the current unit."

The goal is **low coupling** and **high cohesion**:

- Objects know less about each other
- Changes don't cascade through the system
- Testing becomes simpler
- Code becomes more maintainable

## Related Principles

### Development Practices

- [@./CONTAINER_PRESENTATIONAL.md] - Natural application of Demeter in React
- [@./READABLE_CODE.md] - Simpler interfaces improve readability

### Core Principles

- [@../reference/SOLID.md] - Complements SOLID principles
- [@../reference/OCCAMS_RAZOR.md] - Simpler interactions reduce complexity
