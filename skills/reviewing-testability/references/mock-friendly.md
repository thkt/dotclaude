# Mock-Friendly Design - Interfaces & Patterns

## Interface-Based Design

Define interfaces for external dependencies to enable easy mocking.

### Service Interfaces

```typescript
// Bad: Hard to mock: Concrete class
class UserService {
  private db = new PostgresDatabase()

  async getUser(id: string): Promise<User> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}

// Good: Easy to mock: Interface-based
interface UserRepository {
  findById(id: string): Promise<User | null>
  save(user: User): Promise<void>
}

class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id)
    if (!user) throw new NotFoundError('User not found')
    return user
  }
}

// Test with mock
const mockRepo: UserRepository = {
  findById: jest.fn().mockResolvedValue({ id: '1', name: 'Test' }),
  save: jest.fn()
}
const service = new UserService(mockRepo)
```

### HTTP Client Interface

```typescript
interface HttpClient {
  get<T>(url: string): Promise<T>
  post<T>(url: string, body: unknown): Promise<T>
  put<T>(url: string, body: unknown): Promise<T>
  delete(url: string): Promise<void>
}

// Production implementation
class FetchHttpClient implements HttpClient {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url)
    return response.json()
  }
  // ... other methods
}

// Test mock
const mockHttp: HttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}
```

## Factory Pattern

```typescript
// Factory that produces testable instances
function createAuthService(deps: {
  http: HttpClient
  storage: StorageService
  tokenValidator: TokenValidator
}): AuthService {
  return {
    async login(credentials: Credentials) {
      const token = await deps.http.post('/auth/login', credentials)
      await deps.storage.set('token', token)
      return token
    },

    async validateSession() {
      const token = await deps.storage.get('token')
      return deps.tokenValidator.validate(token)
    }
  }
}

// Test
const authService = createAuthService({
  http: mockHttp,
  storage: mockStorage,
  tokenValidator: mockValidator
})
```

## React Testing Patterns

### Wrapper Components for Tests

```typescript
// Create a test wrapper with all providers
function createTestWrapper(overrides: Partial<Services> = {}) {
  const defaultServices: Services = {
    api: mockApi,
    auth: mockAuth,
    storage: mockStorage
  }

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ServicesProvider services={{ ...defaultServices, ...overrides }}>
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      </ServicesProvider>
    )
  }
}

// Test
test('loads user profile', async () => {
  const mockApi = {
    getUser: jest.fn().mockResolvedValue({ id: '1', name: 'Test' })
  }

  render(<UserProfile userId="1" />, {
    wrapper: createTestWrapper({ api: mockApi })
  })

  await waitFor(() => {
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

### MSW for API Mocking

```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Test User' }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetches user', async () => {
  render(<UserProfile userId="1" />)
  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
})

// Override for specific test
test('handles error', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      return res(ctx.status(500))
    })
  )

  render(<UserProfile userId="1" />)
  await waitFor(() => {
    expect(screen.getByText('Error loading user')).toBeInTheDocument()
  })
})
```

## Time & Date Mocking

```typescript
// Bad: Hard to test: Direct Date usage
function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate
}

// Good: Testable: Inject current time
function isExpired(expiryDate: Date, now: Date = new Date()): boolean {
  return now > expiryDate
}

// Test
const expiry = new Date('2024-01-01')
const now = new Date('2024-01-02')
expect(isExpired(expiry, now)).toBe(true)
```

## Checklist

- [ ] Interfaces defined for all external services
- [ ] Factory functions for complex object creation
- [ ] Test wrappers for React components
- [ ] Time/date injectable for time-dependent logic
- [ ] Consider MSW for integration tests
- [ ] Avoid deep mock chains (simplify instead)
