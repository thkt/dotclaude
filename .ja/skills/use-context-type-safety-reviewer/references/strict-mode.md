# Strictモード

## tsconfig.json設定

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

| オプション                   | 効果                                 |
| ---------------------------- | ------------------------------------ |
| `strictNullChecks`           | `null`/`undefined`が異なる型         |
| `noImplicitAny`              | 暗黙の`any`でエラー                  |
| `noUncheckedIndexedAccess`   | 配列アクセスが`T \| undefined`を返す |
| `useUnknownInCatchVariables` | `catch (e)`が`any`でなく`unknown`    |

## 処理パターン

### Nullチェック

```typescript
// undefinedを処理
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

## Reactコンポーネント型

| 型                          | 用途                |
| --------------------------- | ------------------- |
| `React.ReactNode`           | 任意のJSXコンテンツ |
| `React.ReactElement`        | 単一要素            |
| `(item: T) => ReactElement` | Render prop         |

### Propsパターン

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  loading?: boolean;
}
```

### Refパターン

```typescript
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus(); // オプショナルチェーンで安全
```

## チェックリスト

| チェック       | 要件                           |
| -------------- | ------------------------------ |
| tsconfig       | `"strict": true`               |
| 配列安全       | `noUncheckedIndexedAccess`有効 |
| コンポーネント | 適切なHTML属性を拡張           |
| Refs           | `useRef<Type>`で型付け         |
