# Naming & Structure Fundamentals

## Names That Can't Be Misconstrued

```typescript
// ❌ Ambiguous
results.filter(x => x > LIMIT)  // Greater than or equal to?

// ✅ Clear intent
results.filter(x => x >= MIN_ITEMS_TO_DISPLAY)
```

**Key principle**: Anyone reading should understand exactly what the variable represents

---

## Prefer Concrete over Abstract

```typescript
// ❌ Abstract
processData(data)
getUserInfo(id)
handleEvent(e)

// ✅ Concrete
validateUserRegistration(formData)
fetchUserProfileById(userId)
handleLoginButtonClick(event)
```

**Why**: Abstract names force readers to look up implementation to understand purpose

---

## Variable Naming Guidelines

### Specific > Generic

```typescript
// ❌ Generic
const data = fetchUser()
const result = calculate()
const temp = getValue()

// ✅ Specific
const userProfile = fetchUser()
const totalPrice = calculate()
const originalUsername = getValue()
```

### Searchable

```typescript
// ❌ Not searchable
const DAYS_IN_WEEK = 7
for (let i = 0; i < 7; i++)  // Magic number

// ✅ Searchable
const DAYS_IN_WEEK = 7
for (let i = 0; i < DAYS_IN_WEEK; i++)
```

### Pronounceable

```typescript
// ❌ Not pronounceable
const usrCstmrRcd = getRecord()
const genymdhms = generateTimestamp()

// ✅ Pronounceable
const userCustomerRecord = getRecord()
const generatedTimestamp = generateTimestamp()
```

---

## Function Naming Guidelines

### Descriptive Names

```typescript
// ❌ Unclear
function calc() { }
function process() { }
function handle() { }

// ✅ Descriptive
function calculateTotalPrice() { }
function validateUserInput() { }
function handleLoginSubmit() { }
```

### Verb-Noun Pattern

```typescript
// ✅ Action + Target
getUserById(id)
createNewPost(data)
deleteComment(commentId)
isValidEmail(email)
hasPermission(user, resource)
```

---

## Code Structure Fundamentals

### One Task per Function

```typescript
// ❌ Multiple tasks
function processUser(user) {
  // Validate
  if (!user.email) throw Error()
  // Transform
  user.name = user.name.toUpperCase()
  // Save
  db.save(user)
  // Notify
  sendEmail(user.email)
}

// ✅ Single responsibility
function validateUser(user) {
  if (!user.email) throw Error()
}

function normalizeUserData(user) {
  return { ...user, name: user.name.toUpperCase() }
}

function saveUser(user) {
  return db.save(user)
}

function notifyUser(user) {
  sendEmail(user.email)
}
```

### Extract Unrelated Subproblems

```typescript
// ✅ Each function does one thing
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser)
}

function isActiveUser(user: User): boolean {
  return user.status === 'active' && user.lastLogin > thirtyDaysAgo()
}

function thirtyDaysAgo(): Date {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date
}
```

---

## The Final Test

Ask yourself: **"Can someone understand this name/structure without looking at the implementation?"**

If not, make it more concrete and descriptive.
