# 型カバレッジ

目標: 95%以上の型カバレッジ。

## Anyを避ける

| パターン     | 問題           | 解決策             |
| ------------ | -------------- | ------------------ |
| `any` param  | 型チェックなし | 具体的な型を使用   |
| 暗黙のany    | 隠れた型の問題 | 明示的な注釈を追加 |
| `any` return | 型の損失が伝播 | 戻り値型を定義     |

### Anyが許容される場合

| ケース           | 要件               |
| ---------------- | ------------------ |
| @typesがない     | TODOコメントを追加 |
| JS移行中         | 明確な移行計画     |
| 複雑なジェネリク | 理由を文書化       |

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 理由: 外部APIが動的構造を返す
const response: any = await externalApi.fetch();
```

## 明示的な型

| ルール            | 例                                         |
| ----------------- | ------------------------------------------ |
| 関数の戻り値      | `function getUser(): User {}`              |
| 非同期関数        | `async function fetch(): Promise<User> {}` |
| 名前付きInterface | `interface OrderItem { ... }` vs inline    |

## 型推論

| 推論を使用            | 明示を使用                                   |
| --------------------- | -------------------------------------------- |
| `const count = 0`     | `const cache: Map<string, User> = new Map()` |
| `const items = ['a']` | `const config: AppConfig = loadConfig()`     |
| シンプルな代入        | 複雑/ジェネリック型                          |

## チェックリスト

| チェック         | 要件                       |
| ---------------- | -------------------------- |
| エクスポート関数 | 明示的な戻り値型           |
| パラメータ       | すべて型付き               |
| Any使用          | 文書化された正当化         |
| 不明データ       | `any`でなく`unknown`を使用 |
| データ構造       | Interface/type定義         |
