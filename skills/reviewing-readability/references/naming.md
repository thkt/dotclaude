# Naming Conventions

Reusable naming patterns for readable code.

## Unambiguous Names

```typescript
// Bad: Ambiguous
results.filter((x) => x > LIMIT); // Greater than or equal to?

// Good: Clear intent
results.filter((x) => x >= MIN_ITEMS_TO_DISPLAY);
```

**Principle**: Reader understands exactly what the variable represents

## Concrete over Abstract

```typescript
// Bad: Abstract
processData(data);
getUserInfo(id);
handleEvent(e);

// Good: Concrete
validateUserRegistration(formData);
fetchUserProfileById(userId);
handleLoginButtonClick(event);
```

**Why**: Abstract names force readers to look at implementation

## Variable Naming

### Specific > Generic

```typescript
// Bad
const data = fetchUser();
const result = calculate();

// Good
const userProfile = fetchUser();
const totalPrice = calculate();
```

### Searchable

```typescript
// Bad: Magic number
for (let i = 0; i < 7; i++)

// Good: Named constant
const DAYS_IN_WEEK = 7
for (let i = 0; i < DAYS_IN_WEEK; i++)
```

### Pronounceable

```typescript
// Bad
const usrCstmrRcd = getRecord();

// Good
const userCustomerRecord = getRecord();
```

## Function Naming

### Verb-Noun Pattern

```typescript
getUserById(id);
createNewPost(data);
deleteComment(commentId);
isValidEmail(email);
hasPermission(user, resource);
```

## The Final Test

Ask: **"Can someone understand this name without seeing the implementation?"**

If not, make it more specific.

## Related

- [@../../../skills/applying-code-principles/SKILL.md](../../../skills/applying-code-principles/SKILL.md) - Full readability principles
- [@../../applying-frontend-patterns/references/container-presentational.md](../../applying-frontend-patterns/references/container-presentational.md) - Component naming patterns
