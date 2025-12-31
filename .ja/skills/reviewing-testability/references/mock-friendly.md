# モックフレンドリーな設計 - インターフェースとパターン

## インターフェースベースの設計

外部依存関係のインターフェースを定義して、簡単にモック可能に。

### サービスインターフェース

```typescript
// Bad: モック困難: 具象クラス
class UserService {
  private db = new PostgresDatabase()

  async getUser(id: string): Promise<User> {
    return this.db.query('SELECT * FROM users WHERE id = $1', [id])
  }
}

// Good: モック容易: インターフェースベース
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

// モックでテスト
const mockRepo: UserRepository = {
  findById: jest.fn().mockResolvedValue({ id: '1', name: 'Test' }),
  save: jest.fn()
}
const service = new UserService(mockRepo)
```

### HTTPクライアントインターフェース

```typescript
interface HttpClient {
  get<T>(url: string): Promise<T>
  post<T>(url: string, body: unknown): Promise<T>
  put<T>(url: string, body: unknown): Promise<T>
  delete(url: string): Promise<void>
}

// 本番実装
class FetchHttpClient implements HttpClient {
  async get<T>(url: string): Promise<T> {
    const response = await fetch(url)
    return response.json()
  }
  // ... 他のメソッド
}

// テストモック
const mockHttp: HttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}
```

## ファクトリパターン

```typescript
// テスト可能なインスタンスを生成するファクトリ
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

// テスト
const authService = createAuthService({
  http: mockHttp,
  storage: mockStorage,
  tokenValidator: mockValidator
})
```

## Reactテストパターン

### テスト用ラッパーコンポーネント

```typescript
// すべてのプロバイダーを含むテストラッパーを作成
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

// テスト
test('ユーザープロフィールを読み込む', async () => {
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

### APIモックのためのMSW

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

test('ユーザーを取得', async () => {
  render(<UserProfile userId="1" />)
  await waitFor(() => {
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })
})

// 特定のテストでオーバーライド
test('エラーを処理', async () => {
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      return res(ctx.status(500))
    })
  )

  render(<UserProfile userId="1" />)
  await waitFor(() => {
    expect(screen.getByText('ユーザーの読み込みエラー')).toBeInTheDocument()
  })
})
```

## 時間と日付のモック

```typescript
// Bad: テスト困難: 直接Date使用
function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate
}

// Good: テスト可能: 現在時刻を注入
function isExpired(expiryDate: Date, now: Date = new Date()): boolean {
  return now > expiryDate
}

// テスト
const expiry = new Date('2024-01-01')
const now = new Date('2024-01-02')
expect(isExpired(expiry, now)).toBe(true)
```

## チェックリスト

- [ ] すべての外部サービスにインターフェース定義
- [ ] 複雑なオブジェクト作成にファクトリ関数
- [ ] Reactコンポーネントにテストラッパー
- [ ] 時間依存ロジックに時間/日付を注入可能
- [ ] 統合テストにMSWを検討
- [ ] 深いモックチェーンを避ける（代わりにシンプル化）
