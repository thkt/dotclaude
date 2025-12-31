# 型カバレッジ - 明示的な型とanyを避ける

## 型カバレッジ目標

95%以上の型カバレッジを目指します。すべての関数、パラメータ、データ構造に明示的な型を持たせましょう。

## anyを避ける

### なぜ`any`は危険か

```typescript
// Bad: 危険: anyはすべての型チェックを無効化
function processUser(data: any) {
  return data.name.toUpperCase() // コンパイルエラーなし、実行時クラッシュ
}

// Good: 安全: TypeScriptがエラーをキャッチ
function processUser(data: User) {
  return data.name.toUpperCase() // コンパイル時チェック
}
```

### `unknown`を代わりに使用

```typescript
// Good: 安全: unknownは使用前に型チェックが必要
function processUnknownData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value)
  }
  throw new Error('Invalid data format')
}
```

### `any`が許容される場合

`any`が正当化される稀なケース:

1. **型のないサードパーティライブラリ** - `// TODO: @types/libが利用可能になったら型を追加`を追加
2. **JavaScriptからの移行** - 明確な移行計画を持つ一時的なもの
3. **複雑なジェネリック制約** - TypeScriptの型システムで表現できない場合

必ずドキュメント化:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 理由: 外部APIが動的構造を返す、実行時に検証
const response: any = await externalApi.fetch()
```

## 明示的な型注釈

### 関数の戻り値型

```typescript
// Bad: 不適切: 暗黙の戻り値型
function getUser(id: string) {
  return { name: 'John', age: 30 }
}

// Good: 良い: 明示的な戻り値型
function getUser(id: string): User {
  return { name: 'John', age: 30 }
}

// Good: 良い: 非同期関数
async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`)
  return response.data
}
```

### インターフェース定義

```typescript
// Bad: 不適切: インラインオブジェクト型
function createOrder(item: { id: string; price: number }) { }

// Good: 良い: 名前付きインターフェース
interface OrderItem {
  id: string
  price: number
  quantity: number
}

function createOrder(item: OrderItem): Order { }
```

## 型推論のバランス

明らかな場合はTypeScriptに推論させる:

```typescript
// Good: 良い: 単純なケースはTSに推論させる
const count = 0                    // number
const items = ['a', 'b']           // string[]
const user = { name: 'John' }      // { name: string }

// Good: 良い: 明確でない場合は明示的に
const cache: Map<string, User> = new Map()
const config: AppConfig = loadConfig()
```

## チェックリスト

- [ ] すべてのエクスポートされた関数に明示的な戻り値型
- [ ] すべての関数パラメータが型付き
- [ ] 文書化された正当化なしの`any`なし
- [ ] 不明なデータには`any`の代わりに`unknown`を使用
- [ ] すべてのデータ構造にInterface/type定義
- [ ] 型推論は明らかなケースにのみ使用
