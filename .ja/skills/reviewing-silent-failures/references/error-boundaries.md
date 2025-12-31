# Error Boundary - Reactエラーハンドリング

## Error Boundaryとは？

Error BoundaryはReactコンポーネントで、子コンポーネントツリーでのJavaScriptエラーをキャッチし、それらをログに記録し、フォールバックUIを表示します。

**重要**: Error Boundaryは以下でのエラーのみをキャッチします:

- レンダリング
- ライフサイクルメソッド
- 子コンポーネントのコンストラクタ

以下ではキャッチ**しません**:

- イベントハンドラ（try-catchを使用）
- 非同期コード（try-catchを使用）
- サーバーサイドレンダリング
- Boundary自体のエラー

## 基本的なError Boundary

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
    // エラー報告サービスにログ
    logger.error('React Error Boundaryがエラーをキャッチ', {
      error,
      componentStack: errorInfo.componentStack
    })

    // オプションのコールバックを呼び出し
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

## フォールバックUIコンポーネント

```typescript
function DefaultErrorFallback({ error }: { error: Error | null }) {
  return (
    <div role="alert" className="error-fallback">
      <h2>問題が発生しました</h2>
      <p>申し訳ありませんが、予期しないエラーが発生しました。</p>
      {process.env.NODE_ENV === 'development' && error && (
        <pre>{error.message}</pre>
      )}
      <button onClick={() => window.location.reload()}>
        ページを更新
      </button>
    </div>
  )
}

function SectionErrorFallback({ section }: { section: string }) {
  return (
    <div className="section-error">
      <p>{section}を読み込めませんでした。後でお試しください。</p>
      <button onClick={() => window.location.reload()}>
        リトライ
      </button>
    </div>
  )
}
```

## 戦略的な配置

### アプリレベルのBoundary

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

### ページレベルのBoundary

```tsx
function Dashboard() {
  return (
    <Layout>
      <ErrorBoundary fallback={<SectionErrorFallback section="統計" />}>
        <StatsSection />
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback section="チャート" />}>
        <ChartsSection />
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionErrorFallback section="アクティビティ" />}>
        <ActivityFeed />
      </ErrorBoundary>
    </Layout>
  )
}
```

### コンポーネントレベルのBoundary

```tsx
function UserCard({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<UserCardSkeleton />}>
      <UserCardContent userId={userId} />
    </ErrorBoundary>
  )
}
```

## リセット機能付き

```typescript
function ErrorBoundaryWithReset({
  children,
  resetKeys = []
}: {
  children: React.ReactNode
  resetKeys?: unknown[]
}) {
  const [hasError, setHasError] = useState(false)

  // resetKeysが変更されたらリセット
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

## ベストプラクティス

1. **細粒度のBoundary** - アプリ全体を1つのBoundaryでラップしない
2. **意味のあるフォールバック** - 有用なリカバリオプションを表示
3. **エラー報告** - モニタリングサービスにエラーをログ
4. **Boundaryのテスト** - フォールバックUIが正しく動作することを確認
5. **コンテキストを考慮** - クリティカルvs非クリティカルセクション

## チェックリスト

- [ ] 致命的なエラー用のアプリレベルError Boundary
- [ ] 独立した機能用のセクションレベルBoundary
- [ ] フォールバックUIがリカバリオプションを提供
- [ ] エラーがモニタリングサービスに報告される
- [ ] 開発モードでエラー詳細を表示
- [ ] 意図的なエラーでBoundaryをテスト
