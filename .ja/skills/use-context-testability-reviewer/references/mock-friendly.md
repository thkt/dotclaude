# モックフレンドリーな設計

## インターフェースパターン

| インターフェースなし         | インターフェースあり                |
| ---------------------------- | ----------------------------------- |
| クラス内で`new PostgresDB()` | `constructor(private db: Database)` |
| モック困難                   | インターフェース経由で簡単にモック  |

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// テスト
const mockRepo: UserRepository = {
  findById: jest.fn().mockResolvedValue({ id: "1", name: "Test" }),
  save: jest.fn(),
};
```

## ファクトリパターン

```typescript
function createAuthService(deps: { http: HttpClient; storage: Storage }) {
  return {
    login: (creds) => deps.http.post("/auth", creds),
    getToken: () => deps.storage.get("token"),
  };
}

// テスト
const service = createAuthService({
  http: mockHttp,
  storage: mockStorage,
});
```

## Reactテスト

### テストラッパー

```typescript
function createWrapper(overrides = {}) {
  return ({ children }) => (
    <ServicesProvider services={{ ...defaultMocks, ...overrides }}>
      {children}
    </ServicesProvider>
  )
}

render(<Component />, { wrapper: createWrapper({ api: mockApi }) })
```

### API用MSW

```typescript
const server = setupServer(
  rest.get("/api/users/:id", (req, res, ctx) =>
    res(ctx.json({ id: req.params.id, name: "Test" })),
  ),
);
```

## 時間のモック

```typescript
// 時間をパラメータとして注入
function isExpired(expiry: Date, now = new Date()): boolean {
  return now > expiry;
}

// テスト
expect(isExpired(new Date("2024-01-01"), new Date("2024-01-02"))).toBe(true);
```

## チェックリスト

| チェック           | 要件                    |
| ------------------ | ----------------------- |
| 外部サービス       | インターフェース定義    |
| 複雑なオブジェクト | ファクトリ関数          |
| Reactプロバイダー  | テストラッパー利用可能  |
| 時間依存           | 注入可能なnowパラメータ |
