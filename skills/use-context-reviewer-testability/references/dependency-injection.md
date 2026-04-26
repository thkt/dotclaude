# Dependency Injection

## Why DI?

| Without DI         | With DI             |
| ------------------ | ------------------- |
| Hard-coded imports | Injected parameters |
| Can't mock         | Easy mocking        |
| Tight coupling     | Loose coupling      |

## Patterns

### Constructor Injection

```typescript
interface HttpClient {
  get<T>(url: string): Promise<T>;
}

class UserService {
  constructor(private http: HttpClient) {}

  getUser(id: string) {
    return this.http.get<User>(`/users/${id}`);
  }
}

// Test
const service = new UserService(mockHttp);
```

### Factory Function

```typescript
function createOrderService(deps: { db: Database; mailer: Mailer }) {
  return new OrderService(deps.db, deps.mailer);
}

// Test
const service = createOrderService({ db: mockDb, mailer: mockMailer });
```

### React Context

```typescript
const ServicesContext = createContext<Services>(null)

function useServices() {
  return useContext(ServicesContext)
}

// Provider
<ServicesProvider services={{ api: realApi, auth: realAuth }}>
  <App />
</ServicesProvider>

// Test
<ServicesProvider services={{ api: mockApi, auth: mockAuth }}>
  <Component />
</ServicesProvider>
```

### Props Injection

```typescript
// Container (impure) → Presentational (pure)
function UserListContainer() {
  const { data, loading } = useUsers()
  return <UserList users={data} loading={loading} />
}

function UserList({ users, loading }: Props) {
  if (loading) return <Spinner />
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Test presentational directly
render(<UserList users={[{ id: '1', name: 'Test' }]} loading={false} />)
```

## Pattern Selection

| Pattern     | Complexity | Use Case          |
| ----------- | ---------- | ----------------- |
| Props       | Low        | Simple components |
| Constructor | Medium     | Services/classes  |
| Factory     | Medium     | Complex objects   |
| Context     | Medium     | App-wide services |
