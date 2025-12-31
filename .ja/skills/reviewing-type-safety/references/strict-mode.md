# Strictモード - TypeScript設定とReact型

## Strictモード設定

最大の型安全性のために、`tsconfig.json`ですべてのstrictモードオプションを有効にします。

### 推奨設定

```json
{
  "compilerOptions": {
    // Strictモード（以下すべてを有効化）
    "strict": true,

    // または個別に有効化:
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,

    // 追加の安全性
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

### 主要オプションの説明

| オプション | 効果 |
| --- | --- |
| `strictNullChecks` | `null`と`undefined`が異なる型になる |
| `noImplicitAny` | 暗黙の`any`型でエラー |
| `strictFunctionTypes` | より厳格な関数型チェック |
| `noUncheckedIndexedAccess` | 配列/オブジェクトアクセスが`T \| undefined`を返す |
| `useUnknownInCatchVariables` | `catch (e)`が`any`の代わりに`unknown`を使用 |

### Strict Null Checksの処理

```typescript
// Bad: strictNullChecksでエラー
function greet(name: string | undefined) {
  return name.toUpperCase() // エラー: 'name'は'undefined'の可能性があります
}

// Good: null/undefinedを処理
function greet(name: string | undefined) {
  if (!name) return 'Guest'
  return name.toUpperCase()
}

// Good: 非nullアサーション（確実な場合のみ）
function greet(name: string | undefined) {
  // 定義されていることが確実な場合のみ使用
  return name!.toUpperCase()
}
```

### noUncheckedIndexedAccessの処理

```typescript
// noUncheckedIndexedAccess: trueの場合
const arr = [1, 2, 3]
const first = arr[0] // number | undefined

// Bad: エラー
console.log(first.toFixed()) // 'first'は'undefined'の可能性があります

// Good: undefinedを処理
if (first !== undefined) {
  console.log(first.toFixed())
}

// Good: 確実な場合はアサート
console.log(arr[0]!.toFixed()) // インデックスが存在することが確実な場合のみ
```

## Reactコンポーネント型

### 関数コンポーネント

```typescript
// Bad: 不適切: 緩いprop型
interface ButtonProps {
  onClick?: any
  children?: any
}

// Good: 正確なprop型
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}

function Button({ onClick, children, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}
```

### HTML属性の拡張

```typescript
// Good: ネイティブHTML属性を拡張
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

function Button({ variant = 'primary', loading, children, ...props }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
```

### childrenパターン

```typescript
// Good: 明示的なchildren型
interface CardProps {
  children: React.ReactNode // 任意の有効なJSX
}

interface ListProps<T> {
  items: T[]
  children: (item: T) => React.ReactElement // Render prop
}

interface WrapperProps {
  children: React.ReactElement // 単一要素のみ
}
```

### イベントハンドラー

```typescript
// Good: 型付きイベントハンドラー
interface FormProps {
  onSubmit: (data: FormData) => void
}

function Form({ onSubmit }: FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### Ref型

```typescript
// Good: 型付きref
function InputWithFocus() {
  const inputRef = useRef<HTMLInputElement>(null)

  const focus = () => {
    inputRef.current?.focus() // オプショナルチェーンで安全
  }

  return <input ref={inputRef} />
}

// Good: 型付きforwardRef
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <label>
      {label}
      <input ref={ref} {...props} />
    </label>
  )
)
```

## チェックリスト

- [ ] tsconfig.jsonに`"strict": true`
- [ ] 配列安全のため`noUncheckedIndexedAccess`を有効化
- [ ] Reactコンポーネントが適切なHTML属性を拡張
- [ ] イベントハンドラーを適切に型付け
- [ ] refを`useRef<Type>`で正しく型付け
- [ ] 使用時に`forwardRef`を適切に型付け
- [ ] children型がコンポーネントのニーズに一致
