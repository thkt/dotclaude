# 型ガードとDiscriminated Unions

## 型ガード

| ガード型   | ユースケース     | 構文                      |
| ---------- | ---------------- | ------------------------- |
| typeof     | プリミティブ型   | `typeof x === 'string'`   |
| instanceof | クラスインスタンス | `x instanceof Error`      |
| in         | プロパティ存在   | `'radius' in shape`       |
| Predicate  | 複雑な型絞り込み | `function isX(v): v is X` |

## Type Predicateパターン

```typescript
// 定義
function isSuccess<T>(res: Response<T>): res is SuccessResponse<T> {
  return res.success === true;
}

// 使用
if (isSuccess(response)) {
  console.log(response.data); // TypeScriptが型を認識
}
```

## Discriminated Unions

| パターン     | 判別子    | 例                               |
| ------------ | --------- | -------------------------------- |
| Action       | `type`    | `{ type: 'INCREMENT', payload }` |
| APIレスポンス | `success` | `{ success: true, data }`        |
| フォーム状態 | `status`  | `{ status: 'loading' }`          |

## 網羅チェックパターン

```typescript
switch (action.type) {
  case "INCREMENT":
    return state + action.payload;
  case "DECREMENT":
    return state - action.payload;
  default:
    const _exhaustive: never = action; // ケース漏れでコンパイルエラー
    return state;
}
```

## ジェネリクスパターン

| パターン | ユースケース           | 例                               |
| -------- | ---------------------- | -------------------------------- |
| 関数     | 入力型を保持           | `function first<T>(arr: T[]): T` |
| コンポーネント | 再利用可能な型付きコンポーネント | `Select<T>({ value: T })`        |
| 制約     | インターフェースを要求 | `<T extends HasId>`              |

## アンチパターン

| Bad                      | Good                      |
| ------------------------ | ------------------------- |
| `(x as Type).prop`       | 型ガード + `x.prop`      |
| 手動型チェック           | Type Predicate関数        |
| 網羅チェック欠如         | switchのdefaultで`never`  |

## チェックリスト

| 項目                                    | 必須     |
| --------------------------------------- | -------- |
| 複雑なガードにType Predicate            | はい     |
| 関連型にDiscriminated Unions            | はい     |
| `never`による網羅チェック               | はい     |
| 安全でない`as`アサーションを避ける      | はい     |
| 再利用コンポーネントにジェネリクス      | 任意     |
