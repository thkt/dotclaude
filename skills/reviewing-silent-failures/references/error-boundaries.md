# Error Boundaries - React Error Handling

## What Are Error Boundaries?

Error Boundaries are React components that catch JavaScript errors in their child component tree, log those errors, and display a fallback UI.

**Important**: Error Boundaries only catch errors in:

- Rendering
- Lifecycle methods
- Constructors of child components

They do **NOT** catch:

- Event handlers (use try-catch)
- Async code (use try-catch)
- Server-side rendering
- Errors in the boundary itself

## Basic Error Boundary

```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    logger.error('React Error Boundary caught error', {
      error,
      componentStack: errorInfo.componentStack
    })

    // Call optional callback
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
```

## Fallback UI Components

```typescript
function DefaultErrorFallback({ error }: { error: Error | null }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>Something went wrong</h2>
      <p>We're sorry, but something unexpected happened.</p>
      {process.env.NODE_ENV === 'development' && error && (
        <pre>{error.message}</pre>
      )}
      <button onClick={() => window.location.reload()}>
        Refresh Page
      </button>
    </div>
  )
}

function SectionErrorFallback({ section }: { section: string }) {
  return (
    <div className="section-error">
      <p>Unable to load {section}. Please try again later.</p>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}
```

## Strategic Placement

### App-Level Boundary

```tsx
function App() {
  return (
    <ErrorBoundary fallback={<AppCrashPage />}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}
```

### Page-Level Boundaries

```tsx
function Dashboard() {
  return (
    <Layout>
      <ErrorBoundary fallback={<SectionErrorFallback section="Stats" />}>
        <StatsSection />
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback section="Charts" />}>
        <ChartsSection />
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback section="Activity" />}>
        <ActivityFeed />
      </ErrorBoundary>
    </Layout>
  )
}
```

### Component-Level Boundaries

```tsx
function UserCard({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<UserCardSkeleton />}>
      <UserCardContent userId={userId} />
    </ErrorBoundary>
  )
}
```

## With Reset Capability

```typescript
function ErrorBoundaryWithReset({
  children,
  resetKeys = []
}: {
  children: React.ReactNode
  resetKeys?: unknown[]
}) {
  const [hasError, setHasError] = useState(false)

  // Reset when resetKeys change
  useEffect(() => {
    if (hasError) {
      setHasError(false)
    }
  }, resetKeys)

  if (hasError) {
    return (
      <ErrorFallback onReset={() => setHasError(false)} />
    )
  }

  return (
    <ErrorBoundaryClass onError={() => setHasError(true)}>
      {children}
    </ErrorBoundaryClass>
  )
}
```

## Best Practices

1. **Granular boundaries** - Don't wrap entire app in one boundary
2. **Meaningful fallbacks** - Show helpful recovery options
3. **Error reporting** - Log errors to monitoring service
4. **Test boundaries** - Verify fallback UI works correctly
5. **Consider context** - Critical vs non-critical sections

## Checklist

- [ ] App-level Error Boundary for catastrophic errors
- [ ] Section-level boundaries for independent features
- [ ] Fallback UI provides recovery options
- [ ] Errors are reported to monitoring service
- [ ] Development mode shows error details
- [ ] Boundaries tested with intentional errors
