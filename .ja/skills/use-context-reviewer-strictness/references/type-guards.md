# 型ガードと判別共用体

## 型ガード

| ガード種別 | ユースケース       | 構文                      |
| ---------- | ------------------ | ------------------------- |
| typeof     | プリミティブ型     | `typeof x === 'string'`   |
| instanceof | クラスインスタンス | `x instanceof Error`      |
| in         | プロパティの存在   | `'radius' in shape`       |
| Predicate  | 複雑な型の絞り込み | `function isX(v): v is X` |

## 型 Predicate パターン

```typescript
// 定義
function isSuccess<T>(res: Response<T>): res is SuccessResponse<T> {
  return res.success === true;
}

// 使用
if (isSuccess(response)) {
  console.log(response.data); // TypeScript が型を認識する
}
```

## 判別共用体

| パターン     | 判別子    | 例                               |
| ------------ | --------- | -------------------------------- |
| Action       | `type`    | `{ type: 'INCREMENT', payload }` |
| API Response | `success` | `{ success: true, data }`        |
| Form State   | `status`  | `{ status: 'loading' }`          |

## Exhaustive チェックパターン

```typescript
switch (action.type) {
  case "INCREMENT":
    return state + action.payload;
  case "DECREMENT":
    return state - action.payload;
  default:
    const _exhaustive: never = action; // ケースが漏れるとコンパイルエラー
    return state;
}
```

## ジェネリックパターン

| パターン       | ユースケース                     | 例                               |
| -------------- | -------------------------------- | -------------------------------- |
| 関数           | 入力型を保持                     | `function first<T>(arr: T[]): T` |
| コンポーネント | 再利用可能な型付きコンポーネント | `Select<T>({ value: T })`        |
| 制約           | interface を要求                 | `<T extends HasId>`              |

## アンチパターン

| 悪い例                  | 良い例                       |
| ----------------------- | ---------------------------- |
| `(x as Type).prop`      | 型ガード + `x.prop`          |
| 手動の型チェック        | 型 Predicate 関数            |
| Exhaustive チェックなし | switch の default で `never` |

## チェックリスト

| 項目                                     | 必須 |
| ---------------------------------------- | ---- |
| 複雑なガードに対する型 Predicate         | はい |
| 関連する型に対する判別共用体             | はい |
| `never` による Exhaustive チェック       | はい |
| 安全でない `as` アサーションの回避       | はい |
| 再利用可能なコンポーネントのジェネリクス | 任意 |
