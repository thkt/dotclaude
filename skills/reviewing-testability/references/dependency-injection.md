# Dependency Injection - Injectable Dependencies

## Why Dependency Injection?

DI makes code testable by allowing you to swap real dependencies with mocks.

| Without DI | With DI |
| --- | --- |
| Hard-coded imports | Injected via constructor/props |
| Can't mock easily | Easy to mock |
| Tests need real services | Tests use simple stubs |
| Tight coupling | Loose coupling |

## Patterns

### Constructor Injection

```typescript
// ❌ Hard to test: Direct dependency
class UserService {
  async getUser(id: string) {
    return fetch(`/api/users/${id}`).then(r => r.json())
  }
}

// ✅ Testable: Injectable dependency
interface HttpClient {
  get<T>(url: string): Promise<T>
}

class UserService {
  constructor(private http: HttpClient) {}

  async getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`)
  }
}

// Test
const mockHttp: HttpClient = {
  get: jest.fn().mockResolvedValue({ id: '1', name: 'Test' })
}
const service = new UserService(mockHttp)
```

### Factory Functions

```typescript
// ❌ Hard to test
export function createOrderService() {
  const db = new Database()
  const mailer = new EmailService()
  return new OrderService(db, mailer)
}

// ✅ Testable
interface OrderServiceDeps {
  db: Database
  mailer: EmailService
}

export function createOrderService(deps: OrderServiceDeps) {
  return new OrderService(deps.db, deps.mailer)
}

// Test
const service = createOrderService({
  db: mockDatabase,
  mailer: mockMailer
})
```

### React Context for DI

```typescript
// Define services interface
interface Services {
  api: ApiClient
  auth: AuthService
  storage: StorageService
}

// Create context
const ServicesContext = createContext<Services | null>(null)

// Provider
function ServicesProvider({ children, services }: {
  children: React.ReactNode
  services: Services
}) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  )
}

// Hook
function useServices() {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('ServicesProvider required')
  return services
}

// Component
function UserProfile() {
  const { api } = useServices()
  // Use api...
}

// Test
render(
  <ServicesProvider services={{ api: mockApi, auth: mockAuth, storage: mockStorage }}>
    <UserProfile />
  </ServicesProvider>
)
```

### Props Injection (Simplest)

```typescript
// ❌ Hard to test: Hook with side effect
function UserList() {
  const users = useUsers() // Calls API internally
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// ✅ Testable: Props-based
interface UserListProps {
  users: User[]
  loading?: boolean
  error?: string
}

function UserList({ users, loading, error }: UserListProps) {
  if (loading) return <Spinner />
  if (error) return <Error message={error} />
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Container handles the side effect
function UserListContainer() {
  const { data, loading, error } = useUsers()
  return <UserList users={data ?? []} loading={loading} error={error} />
}

// Test
render(<UserList users={[{ id: '1', name: 'Test' }]} />)
```

## When to Use Each Pattern

| Pattern | Use Case | Complexity |
| --- | --- | --- |
| Props Injection | Simple components | Low |
| Constructor Injection | Services/classes | Medium |
| Factory Functions | Complex objects | Medium |
| React Context | App-wide services | Medium |

## Checklist

- [ ] Dependencies passed as parameters, not imported directly
- [ ] Interfaces defined for external services
- [ ] Factory functions for complex object creation
- [ ] React Context for app-wide services
- [ ] Simple props injection for components
