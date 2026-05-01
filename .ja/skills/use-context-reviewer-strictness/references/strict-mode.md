# Strict Mode

## tsconfig.json の設定

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## 主要オプション

| オプション                   | 効果                                       |
| ---------------------------- | ------------------------------------------ |
| `strictNullChecks`           | `null`/`undefined` を別の型として扱う      |
| `noImplicitAny`              | 暗黙の `any` をエラーにする                |
| `noUncheckedIndexedAccess`   | 配列アクセスは `T \| undefined` を返す     |
| `useUnknownInCatchVariables` | `catch (e)` を `any` ではなく `unknown` に |

## 処理パターン

### Null チェック

```typescript
// undefined を処理する
function greet(name?: string) {
  if (!name) return "Guest";
  return name.toUpperCase();
}
```

### 配列アクセス

```typescript
const arr = [1, 2, 3];
const first = arr[0]; // number | undefined
if (first !== undefined) {
  console.log(first.toFixed());
}
```

## React コンポーネント型

| 型                          | 用途                  |
| --------------------------- | --------------------- |
| `React.ReactNode`           | 任意の JSX コンテンツ |
| `React.ReactElement`        | 単一要素              |
| `(item: T) => ReactElement` | render prop           |

### Props パターン

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}
```

### Ref パターン

```typescript
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus(); // optional chaining で安全
```

## チェックリスト

| チェック       | 要件                                |
| -------------- | ----------------------------------- |
| tsconfig       | `"strict": true`                    |
| 配列の安全性   | `noUncheckedIndexedAccess` を有効化 |
| コンポーネント | 適切な HTML 属性を継承する          |
| Ref            | `useRef<Type>` で型付け             |
