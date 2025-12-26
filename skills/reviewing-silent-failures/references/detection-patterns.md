# Detection Patterns - Finding Silent Failures

## Search Commands

Use these commands to find silent failure patterns in your codebase.

### Empty Catch Blocks

```bash
# Completely empty catch
rg "catch\s*\([^)]*\)\s*\{\s*\}" --glob "*.{ts,tsx,js,jsx}"

# Catch with only comment
rg "catch\s*\([^)]*\)\s*\{\s*//.*\s*\}" --glob "*.{ts,tsx,js,jsx}"

# Catch with only block comment
rg "catch\s*\([^)]*\)\s*\{\s*/\*.*\*/\s*\}" --glob "*.{ts,tsx,js,jsx}"
```

### Promises Without Error Handling

```bash
# .then() without .catch()
rg "\.then\([^)]+\)$" --glob "*.{ts,tsx,js,jsx}"

# Multiple .then() without final .catch()
rg "\.then\([^)]+\)\s*\.then" --glob "*.{ts,tsx,js,jsx}"
```

### Console-Only Error Handling

```bash
# catch block with only console.log
rg "catch.*console\.(log|error|warn)" --glob "*.{ts,tsx,js,jsx}"
```

### Fire and Forget

```bash
# Async function call without await or .then
rg "^\s*[a-zA-Z]+Async\(" --glob "*.{ts,tsx,js,jsx}"

# Common patterns
rg "(fetch|axios|api)\([^)]+\)$" --glob "*.{ts,tsx,js,jsx}"
```

## Pattern Examples

### Empty Catch Variations

```typescript
// ❌ Completely empty
try { await risky() } catch (e) { }

// ❌ Only comment (TODO never gets done)
try { await risky() } catch (error) {
  // TODO: handle error
}

// ❌ Underscore doesn't make it OK
try { await risky() } catch (_) { }

// ❌ Logged but not handled
try { await risky() } catch (error) {
  console.log(error)
}
```

### Promise Chains Without Catch

```typescript
// ❌ No error handling
fetchUser(id).then(user => setUser(user))

// ❌ Multiple then, no catch
fetchUser(id)
  .then(user => user.profile)
  .then(profile => setProfile(profile))

// ✅ With error handling
fetchUser(id)
  .then(user => setUser(user))
  .catch(error => handleError(error))
```

### Async/Await Without Try-Catch

```typescript
// ❌ No error handling
async function loadData() {
  const data = await fetchData() // If this throws, function throws
  return processData(data)
}

// ✅ With error handling
async function loadData() {
  try {
    const data = await fetchData()
    return processData(data)
  } catch (error) {
    logger.error('Failed to load data', error)
    throw new DataLoadError('Failed to load data', { cause: error })
  }
}
```

## Severity Classification

| Pattern | Severity | Action |
| --- | --- | --- |
| Empty catch block | 🔴 Critical | Immediate fix required |
| Promise without catch | 🔴 Critical | Add error handling |
| Console.log only | 🟡 High | Add user feedback |
| Fire and forget | 🟡 High | Add await or .catch |
| Missing Error Boundary | 🟡 High | Wrap major sections |

## Automated Detection

Consider adding ESLint rules:

```json
{
  "rules": {
    "no-empty": ["error", { "allowEmptyCatch": false }],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```
