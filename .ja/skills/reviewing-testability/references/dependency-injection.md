# 依存性注入 - 注入可能な依存関係

## なぜ依存性注入か？

DIは実際の依存関係をモックと交換できるようにすることで、コードをテスト可能にします。

| DIなし | DIあり |
| --- | --- |
| ハードコードされたインポート | コンストラクタ/propsで注入 |
| 簡単にモックできない | 簡単にモック可能 |
| テストに実際のサービスが必要 | テストはシンプルなスタブを使用 |
| 密結合 | 疎結合 |

## パターン

### コンストラクタ注入

```typescript
// Bad: テスト困難: 直接依存
class UserService {
  async getUser(id: string) {
    return fetch(`/api/users/${id}`).then(r => r.json())
  }
}

// Good: テスト可能: 注入可能な依存関係
interface HttpClient {
  get<T>(url: string): Promise<T>
}

class UserService {
  constructor(private http: HttpClient) {}

  async getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`)
  }
}

// テスト
const mockHttp: HttpClient = {
  get: jest.fn().mockResolvedValue({ id: '1', name: 'Test' })
}
const service = new UserService(mockHttp)
```

### ファクトリ関数

```typescript
// Bad: テスト困難
export function createOrderService() {
  const db = new Database()
  const mailer = new EmailService()
  return new OrderService(db, mailer)
}

// Good: テスト可能
interface OrderServiceDeps {
  db: Database
  mailer: EmailService
}

export function createOrderService(deps: OrderServiceDeps) {
  return new OrderService(deps.db, deps.mailer)
}

// テスト
const service = createOrderService({
  db: mockDatabase,
  mailer: mockMailer
})
```

### DI用のReact Context

```typescript
// サービスインターフェースを定義
interface Services {
  api: ApiClient
  auth: AuthService
  storage: StorageService
}

// コンテキストを作成
const ServicesContext = createContext<Services | null>(null)

// プロバイダー
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

// フック
function useServices() {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('ServicesProviderが必要です')
  return services
}

// コンポーネント
function UserProfile() {
  const { api } = useServices()
  // apiを使用...
}

// テスト
render(
  <ServicesProvider services={{ api: mockApi, auth: mockAuth, storage: mockStorage }}>
    <UserProfile />
  </ServicesProvider>
)
```

### Props注入（最もシンプル）

```typescript
// Bad: テスト困難: 副作用のあるフック
function UserList() {
  const users = useUsers() // 内部でAPIを呼び出す
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
}

// Good: テスト可能: Propsベース
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

// コンテナが副作用を処理
function UserListContainer() {
  const { data, loading, error } = useUsers()
  return <UserList users={data ?? []} loading={loading} error={error} />
}

// テスト
render(<UserList users={[{ id: '1', name: 'Test' }]} />)
```

## 各パターンをいつ使うか

| パターン | ユースケース | 複雑さ |
| --- | --- | --- |
| Props注入 | シンプルなコンポーネント | 低 |
| コンストラクタ注入 | サービス/クラス | 中 |
| ファクトリ関数 | 複雑なオブジェクト | 中 |
| React Context | アプリ全体のサービス | 中 |

## チェックリスト

- [ ] 依存関係は直接インポートではなくパラメータとして渡す
- [ ] 外部サービスにインターフェース定義
- [ ] 複雑なオブジェクト作成にファクトリ関数
- [ ] アプリ全体のサービスにReact Context
- [ ] コンポーネントにシンプルなprops注入
