# 依存性注入

## なぜDI？

| DIなし             | DIあり         |
| ------------------ | -------------- |
| ハードコードimport | 注入パラメータ |
| モック不可         | 簡単にモック   |
| 密結合             | 疎結合         |

## パターン

### コンストラクタ注入

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

// テスト
const service = new UserService(mockHttp);
```

### ファクトリ関数

```typescript
function createOrderService(deps: { db: Database; mailer: Mailer }) {
  return new OrderService(deps.db, deps.mailer);
}

// テスト
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

// テスト
<ServicesProvider services={{ api: mockApi, auth: mockAuth }}>
  <Component />
</ServicesProvider>
```

### Props注入

```typescript
// Container (不純) → Presentational (純粋)
function UserListContainer() {
  const { data, loading } = useUsers()
  return <UserList users={data} loading={loading} />
}

function UserList({ users, loading }: Props) {
  if (loading) return <Spinner />
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Presentationalを直接テスト
render(<UserList users={[{ id: '1', name: 'Test' }]} loading={false} />)
```

## パターン選択

| パターン    | 複雑さ | ユースケース             |
| ----------- | ------ | ------------------------ |
| Props       | 低     | シンプルなコンポーネント |
| Constructor | 中     | サービス/クラス          |
| Factory     | 中     | 複雑なオブジェクト       |
| Context     | 中     | アプリ全体サービス       |
