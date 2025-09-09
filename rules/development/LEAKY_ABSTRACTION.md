# The Law of Leaky Abstractions

**Core principle**: "All non-trivial abstractions, to some degree, are leaky" - Joel Spolsky

## Core Philosophy

Abstractions are meant to simplify, but they inevitably expose their underlying complexity. **Accept this reality and design accordingly.**

The goal isn't to create perfect abstractions, but to:

- **Recognize where leaks will occur**
- **Plan for when they happen**
- **Keep abstractions as simple as possible**
- **Know when to break through them**

## The Problem with Perfect Abstractions

```typescript
// ❌ The illusion: "You never need to know SQL"
const users = await User.findAll({
  where: { active: true },
  include: ['posts', 'comments']
})

// ✅ The reality: Performance forces you to know SQL
const users = await db.raw(`
  SELECT u.*, COUNT(p.id) as posts
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  WHERE u.active = true
  GROUP BY u.id
`)
```

The abstraction leaked. You needed SQL knowledge anyway.

## Common Leaky Abstractions

### 1. ORMs

```typescript
// ❌ Believing the abstraction is complete
async getActiveUsers() {
  return User.findAll({ where: { active: true }})
  // Hidden: N+1 queries, no control over SQL
}

// ✅ Acknowledging the leak
async getActiveUsers() {
  return simpleQuery
    ? User.findAll({ where: { active: true }})
    : this.db.raw(optimizedQuery)
}
```

### 2. Network Calls

```typescript
// ❌ Pretending network calls are local
async function getUser(id: string) {
  return api.users.get(id)
}

// ✅ Acknowledging network reality
async function getUser(id: string) {
  try {
    return await withTimeout(api.users.get(id), 5000)
  } catch (error) {
    if (isNetworkError(error)) {
      return retry(() => api.users.get(id))
    }
    throw error
  }
}
```

### 3. Cross-Platform Code

```typescript
// ❌ Ignoring platform differences
const filePath = `${dir}/${filename}`

// ✅ Platform-aware
import path from 'path'
const filePath = path.join(dir, filename)
```

## Designing with Leaks in Mind

### 1. Progressive Abstraction

```typescript
class DataService {
  // Level 1: Simple cases (80%)
  async findUsers(criteria: Simple) {
    return this.orm.findAll(criteria)
  }

  // Level 2: Complex cases
  async findUsersRaw(sql: string) {
    return this.db.raw(sql)  // Escape hatch
  }
}
```

### 2. Provide Escape Hatches

```typescript
class CacheLayer {
  async get(key: string) {
    return this.redis.get(key)
  }

  // Escape hatch when abstraction breaks
  get rawClient() {
    return this.redis
  }
}
```

### 3. Document the Boundaries

```typescript
/**
 * ABSTRACTION LIMITS:
 * - Max response: 5MB
 * - Timeout: 30 seconds
 * For bulk ops, use bulkFetchUsers()
 */
async function fetchUser(id: string) {
  // Implementation
}
```

## When to Break Through Abstractions

### Performance Requirements

```typescript
// Too slow: 5 seconds
await orm.findAll({ include: ['author', 'tags'] })

// Break through: 100ms
await db.raw('SELECT * FROM posts...')
```

## Guidelines for Managing Leaky Abstractions

### Layer Your Abstractions

```markdown
High-level (Business Logic)
    ↓
Mid-level (Service Layer)  ← Most code here
    ↓
Low-level (Direct Access)   ← Escape hatches
```

### Monitor Abstraction Health

Signs your abstraction is too leaky:

- Constantly using escape hatches
- Everyone needs to know implementation details
- More edge cases than normal cases

### Know Your Stack

- **Understand one level below**: If using React, understand DOM
- **Learn the failure modes**: Know how your ORM fails
- **Study the edge cases**: What breaks your framework?

## Integration with Other Principles

### Progressive Enhancement

- Start with simple abstractions
- Add complexity only when leaks appear

### Occam's Razor

- Simple leaky abstraction > complex "perfect" abstraction

### YAGNI

- Don't add abstraction layers for imagined needs
- Wait until the leak actually happens

## Practical Application

### Component Library

```tsx
// ✅ Provides escape hatches
function Button({
  children,
  onClick,
  className,      // Escape hatch for styles
  ...restProps    // Escape hatch for DOM props
}) {
  return (
    <button
      className={cn('btn-default', className)}
      onClick={onClick}
      {...restProps}
    >
      {children}
    </button>
  )
}
```

## Remember

> "The Law of Leaky Abstractions means that whenever somebody comes up with a wizzy new code-generation tool that is supposed to make us all ever-so-efficient, you hear a lot of people saying 'learn how to do it manually first, then use the wizzy tool to save time.'" - Joel Spolsky

**Key Takeaways**:

- All abstractions leak - plan for it
- Know one level below your abstraction
- Provide escape hatches
- Document the boundaries
- Progressive enhancement applies to abstractions too

## Related Principles

### Development Practices

- [@./PROGRESSIVE_ENHANCEMENT.md] - Build abstractions progressively
- [@./LAW_OF_DEMETER.md] - Manage abstraction boundaries

### Core Principles

- [@../reference/OCCAMS_RAZOR.md] - Simple leaky abstractions over complex "perfect" ones
- [@../reference/SOLID.md] - DIP must account for leaky abstractions
