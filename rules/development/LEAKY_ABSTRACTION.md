---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  All non-trivial abstractions leak. Accept this reality.
  Provide escape hatches, document boundaries.
  Simple leaky abstraction > complex "perfect" abstraction.
decision_question: "Am I fighting the framework or working with it?"
---

# The Law of Leaky Abstractions like Joel Spolsky

**Core principle**: "All non-trivial abstractions, to some degree, are leaky"

## Core Philosophy

Abstractions are meant to simplify, but they inevitably expose their underlying complexity. **Accept this reality and design accordingly.**

The goal isn't to create perfect abstractions, but to:

- **Recognize where leaks will occur**
- **Plan for when they happen**
- **Keep abstractions as simple as possible**
- **Know when to break through them**

## The Problem with Perfect Abstractions

```typescript
// Bad: The illusion: "You never need to know SQL"
const users = await User.findAll({
  where: { active: true },
  include: ['posts', 'comments']
})

// Good: The reality: Performance forces you to know SQL
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

| Abstraction | How it Leaks | Solution |
| --- | --- | --- |
| **ORMs** | N+1 queries, no SQL control | Provide raw query escape hatch |
| **Network Calls** | Pretends local, fails unpredictably | Add timeout, retry, error handling |
| **Cross-Platform** | Platform-specific paths/APIs | Use platform-aware libraries |

## Designing with Leaks in Mind

| Strategy | How | When |
| --- | --- | --- |
| **Progressive Abstraction** | Simple API for 80%, raw access for 20% | `findUsers(criteria)` + `findUsersRaw(sql)` |
| **Escape Hatches** | Expose underlying client | `get rawClient()` for direct access |
| **Document Boundaries** | JSDoc with limits | Max response: 5MB, timeout: 30s |

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
// Good: Provides escape hatches
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

See: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
