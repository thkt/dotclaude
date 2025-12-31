# エラーハンドリング - 適切なパターン

## エラーハンドリングの原則

1. **コンテキストを含めてログ** - ユーザーID、アクション、タイムスタンプを含める
2. **ユーザーに通知** - 適切なエラーメッセージを表示
3. **リカバリを可能に** - リトライまたはフォールバックオプションを提供
4. **スタックを保持** - エラー詳細を失わない

## 適切なTry-Catchパターン

### 基本パターン

```typescript
try {
  await riskyOperation()
} catch (error) {
  // 1. コンテキストを含めてログ
  logger.error('操作に失敗', {
    error,
    userId: user.id,
    action: 'riskyOperation',
    timestamp: new Date().toISOString()
  })

  // 2. ユーザーに通知
  showError('操作に失敗しました。もう一度お試しください。')

  // 3. オプション: モニタリングに報告
  reportError(error)
}
```

### ReactコンポーネントでのAsync/Await

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
        logger.error('ユーザーの読み込みに失敗', { userId, error: err })
        setError('ユーザープロフィールの読み込みに失敗しました。更新してください。')
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

### イベントハンドラのエラーハンドリング

```typescript
// Bad: エラーを飲み込む
<button onClick={() => {
  try { submitForm() } catch (e) { }
}}>送信</button>

// Good: エラーを適切に処理
<button onClick={async () => {
  try {
    setSubmitting(true)
    await submitForm()
    showSuccess('送信しました！')
  } catch (error) {
    logger.error('フォーム送信に失敗', error)
    showError('送信に失敗しました。もう一度お試しください。')
  } finally {
    setSubmitting(false)
  }
}}>送信</button>
```

## Promiseチェーンのエラーハンドリング

```typescript
// Good: 最後に単一のcatch
fetchUser(id)
  .then(user => user.profile)
  .then(profile => setProfile(profile))
  .catch(error => {
    logger.error('プロフィールの読み込みに失敗', error)
    setError('プロフィールを読み込めませんでした')
  })

// Good: クリーンアップのためのfinally
fetchData()
  .then(data => processData(data))
  .then(result => setResult(result))
  .catch(error => setError(error.message))
  .finally(() => setLoading(false))
```

## カスタムエラークラス

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

// 使用法
try {
  await saveUser(user)
} catch (error) {
  if (error instanceof ValidationError) {
    showFieldError(error.field, error.message)
  } else if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      redirectToLogin()
    } else {
      showError('サーバーエラー。もう一度お試しください。')
    }
  } else {
    showError('予期しないエラーが発生しました。')
  }
}
```

## エラー報告

```typescript
function reportError(error: unknown, context?: Record<string, unknown>) {
  // 開発環境ではコンソールにログ
  if (process.env.NODE_ENV === 'development') {
    console.error('エラー:', error, 'コンテキスト:', context)
  }

  // 本番環境ではモニタリングサービスに報告
  if (process.env.NODE_ENV === 'production') {
    // Sentry、Bugsnag等
    errorReporter.captureException(error, { extra: context })
  }
}
```
