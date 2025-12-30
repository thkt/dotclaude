# Error Handling - Proper Patterns

## Error Handling Principles

1. **Log with context** - Include user ID, action, timestamp
2. **Inform the user** - Show appropriate error message
3. **Enable recovery** - Provide retry or fallback options
4. **Preserve the stack** - Don't lose error details

## Proper Try-Catch Patterns

### Basic Pattern

```typescript
try {
  await riskyOperation()
} catch (error) {
  // 1. Log with context
  logger.error('Operation failed', {
    error,
    userId: user.id,
    action: 'riskyOperation',
    timestamp: new Date().toISOString()
  })

  // 2. Inform user
  showError('Operation failed. Please try again.')

  // 3. Optional: Report to monitoring
  reportError(error)
}
```

### Async/Await in React Components

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchUser(userId)
        setUser(data)
      } catch (err) {
        logger.error('Failed to load user', { userId, error: err })
        setError('Failed to load user profile. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [userId])

  if (loading) return <Spinner />
  if (error) return <ErrorMessage message={error} />
  if (!user) return null

  return <ProfileCard user={user} />
}
```

### Event Handler Error Handling

```typescript
// Bad: Bad: Swallows errors
<button onClick={() => {
  try { submitForm() } catch (e) { }
}}>Submit</button>

// Good: Good: Handles errors properly
<button onClick={async () => {
  try {
    setSubmitting(true)
    await submitForm()
    showSuccess('Submitted!')
  } catch (error) {
    logger.error('Form submission failed', error)
    showError('Failed to submit. Please try again.')
  } finally {
    setSubmitting(false)
  }
}}>Submit</button>
```

## Promise Chain Error Handling

```typescript
// Good: Single catch at the end
fetchUser(id)
  .then(user => user.profile)
  .then(profile => setProfile(profile))
  .catch(error => {
    logger.error('Failed to load profile', error)
    setError('Could not load profile')
  })

// Good: With finally for cleanup
fetchData()
  .then(data => processData(data))
  .then(result => setResult(result))
  .catch(error => setError(error.message))
  .finally(() => setLoading(false))
```

## Custom Error Classes

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Usage
try {
  await saveUser(user)
} catch (error) {
  if (error instanceof ValidationError) {
    showFieldError(error.field, error.message)
  } else if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      redirectToLogin()
    } else {
      showError('Server error. Please try again.')
    }
  } else {
    showError('An unexpected error occurred.')
  }
}
```

## Error Reporting

```typescript
function reportError(error: unknown, context?: Record<string, unknown>) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error, 'Context:', context)
  }

  // Report to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Sentry, Bugsnag, etc.
    errorReporter.captureException(error, { extra: context })
  }
}
```
