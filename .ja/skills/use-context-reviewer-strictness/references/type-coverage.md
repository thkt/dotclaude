# 型カバレッジ

目標。型カバレッジ 95% 以上。

## any の回避

| パターン         | 問題               | 解決               |
| ---------------- | ------------------ | ------------------ |
| `any` パラメータ | 型チェックなし     | 具体的な型を使う   |
| 暗黙の any       | 型の問題が隠れる   | 明示的な注釈を追加 |
| `any` 戻り値     | 型情報の損失が伝播 | 戻り値型を定義     |

### any が許容される場合

| ケース              | 要件                |
| ------------------- | ------------------- |
| @types が存在しない | TODO コメントを追加 |
| JS からの移行       | 明確な移行計画      |
| 複雑なジェネリクス  | 理由を文書化        |

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Reason: External API returns dynamic structure
const response: any = await externalApi.fetch();
```

## 明示的な型

| ルール             | 例                                            |
| ------------------ | --------------------------------------------- |
| 関数の戻り値       | `function getUser(): User {}`                 |
| async 関数         | `async function fetch(): Promise<User> {}`    |
| 名前付き interface | inline ではなく `interface OrderItem { ... }` |

## 型推論

| 推論を使う            | 明示する                                     |
| --------------------- | -------------------------------------------- |
| `const count = 0`     | `const cache: Map<string, User> = new Map()` |
| `const items = ['a']` | `const config: AppConfig = loadConfig()`     |
| 単純な代入            | 複雑/ジェネリックな型                        |

## チェックリスト

| チェック         | 要件                     |
| ---------------- | ------------------------ |
| エクスポート関数 | 明示的な戻り値型         |
| パラメータ       | 全て型付け               |
| any 使用         | 正当化を文書化           |
| 未知のデータ     | `any` ではなく `unknown` |
| データ構造       | interface/type を定義    |
