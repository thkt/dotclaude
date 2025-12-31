# 型ガード - ナローイングと判別可能なUnion

## 型ガード

型ガードにより、TypeScriptは実行時に型を安全にナローイングできます。

### 型述語関数

```typescript
// Good: 型述語関数
function isSuccess<T>(response: Response<T>): response is SuccessResponse<T> {
  return response.success === true
}

// 使用方法
if (isSuccess(response)) {
  console.log(response.data) // TypeScriptはこれがSuccessResponseだと知っている
}
```

### 一般的な型ガード

```typescript
// typeofガード
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase() // stringメソッドが利用可能
  }
  return value.toFixed(2) // numberメソッドが利用可能
}

// instanceofガード
function handleError(error: Error | ValidationError) {
  if (error instanceof ValidationError) {
    return error.fields // ValidationErrorプロパティが利用可能
  }
  return error.message
}

// 'in'演算子ガード
function getArea(shape: Circle | Rectangle) {
  if ('radius' in shape) {
    return Math.PI * shape.radius ** 2
  }
  return shape.width * shape.height
}
```

### 安全でないアサーションを避ける

```typescript
// Bad: 安全でない型アサーション
if ((response as SuccessResponse).data) {
  console.log((response as SuccessResponse).data)
}

// Good: 型述語関数
if (isSuccess(response)) {
  console.log(response.data)
}
```

## 判別可能なUnion

共通のプロパティ（判別子）を使用してUnionメンバーを区別します。

### 基本パターン

```typescript
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'INCREMENT':
      return state + action.payload // payloadはnumber
    case 'DECREMENT':
      return state - action.payload
    case 'RESET':
      return 0
    default:
      // 網羅的チェック
      const _exhaustive: never = action
      return state
  }
}
```

### APIレスポンスパターン

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

function handleResponse<T>(response: ApiResponse<T>): T {
  if (response.success) {
    return response.data // TypeScriptはdataが存在することを知っている
  }
  throw new Error(response.error) // TypeScriptはerrorが存在することを知っている
}
```

### フォーム状態パターン

```typescript
type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: FormData }
  | { status: 'error'; error: string }

function renderForm(state: FormState) {
  switch (state.status) {
    case 'idle': return <Form />
    case 'loading': return <Spinner />
    case 'success': return <SuccessMessage data={state.data} />
    case 'error': return <ErrorMessage error={state.error} />
  }
}
```

## ジェネリック型

再利用可能で型安全なコンポーネントにジェネリクスを使用します。

### ジェネリック関数

```typescript
// Good: ジェネリック型は入力型を保持
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

const num = first([1, 2, 3])     // number | undefined
const str = first(['a', 'b'])   // string | undefined
```

### ジェネリックコンポーネント

```typescript
// Good: ジェネリックReactコンポーネント
interface SelectProps<T> {
  value: T
  options: T[]
  onChange: (value: T) => void
  getLabel?: (item: T) => string
}

function Select<T>({ value, options, onChange, getLabel }: SelectProps<T>) {
  return (
    <select
      value={String(value)}
      onChange={(e) => {
        const selected = options.find((opt) => String(opt) === e.target.value)
        if (selected) onChange(selected)
      }}
    >
      {options.map((option) => (
        <option key={String(option)} value={String(option)}>
          {getLabel ? getLabel(option) : String(option)}
        </option>
      ))}
    </select>
  )
}
```

### ジェネリック制約

```typescript
// Good: 制約付きジェネリック
interface HasId {
  id: string | number
}

function findById<T extends HasId>(items: T[], id: T['id']): T | undefined {
  return items.find((item) => item.id === id)
}
```

## チェックリスト

- [ ] 複雑な型ガードには型述語関数
- [ ] 関連する型には判別可能なUnion
- [ ] switch文で`never`を使った網羅的チェック
- [ ] 安全でない`as`アサーションを避ける
- [ ] 再利用可能なコンポーネントにジェネリクス
- [ ] 必要に応じてジェネリック制約
