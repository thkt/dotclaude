# コメントとコードの明確さ

## コア原則: なぜであって何ではない

```typescript
// Bad: 何のコメント（冗長）
// カウンターを1増加
counter++

// Bad: 何のコメント（自明）
// ユーザーが管理者かチェック
if (user.role === 'admin') { }

// Good: なぜのコメント（価値がある）
// リトライストーム時にサーバーを圧倒しないよう指数バックオフを使用
await sleep(Math.pow(2, retryCount) * 1000)

// Good: なぜのコメント（ビジネスコンテキスト）
// 法的要件: データは7年間保持する必要がある
const DATA_RETENTION_DAYS = 7 * 365
```

---

## コード優先、コメント二番目

### 自己文書化コード

```typescript
// Bad: 説明するためにコメントが必要
// ユーザーがプレミアム機能にアクセスできるかチェック
if (u.sub && u.sub.exp > Date.now() && !u.ban) {
  // ...
}

// Good: コードが自身を説明
function canAccessPremiumFeatures(user: User): boolean {
  return user.hasActiveSubscription() &&
         !user.isBanned
}

if (canAccessPremiumFeatures(user)) {
  // ...
}
```

---

## コードを意図のように見せる

```typescript
// Bad: 意図が不明確
const p = products.filter(p => p.price > 0 && p.stock)

// Good: 意図が明確
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

---

## 古いコメントは更新または削除

```typescript
// Bad: 古いコメント（危険）
// ユーザーIDを返す
function getUser() {
  return { id: 123, name: 'John', email: 'john@example.com' }  // 今は完全なユーザーオブジェクトを返す
}

// Good: コメント不要（型が全てを語る）
function getUser(): User {
  return { id: 123, name: 'John', email: 'john@example.com' }
}
```

**ルール**: 古いコメントはコメントなしより悪い

---

## コメントが必要な場合

### 1. 複雑なアルゴリズム

```typescript
// Good: アルゴリズムの選択を説明
// 大きなテキストでの高速文字列マッチングのためBM法を使用
// 時間計算量: 最良ケースでO(n/m) vs 単純アプローチのO(n*m)
function searchPattern(text: string, pattern: string) {
  // 実装
}
```

### 2. 非自明なビジネスルール

```typescript
// Good: ビジネスコンテキスト
// 法務チームによる: EUユーザーはマーケティングメールに明示的にオプトインする必要がある（GDPR）
// デフォルトはfalse、他の地域ではtrueとは異なる
const marketingOptIn = user.region === 'EU' ? false : true
```

### 3. ワークアラウンドと技術的負債

```typescript
// Good: ワークアラウンドを説明
// TODO: API v2がデプロイされたらこのハックを削除（目標: 2025年Q2）
// 現在のAPIは日付を一貫性のない形式で返す
const normalizedDate = parseFlexibleDateFormat(apiResponse.date)
```

### 4. パフォーマンス最適化

```typescript
// Good: 最適化を説明
// レンダリングごとの高コストなDBクエリを避けるため結果をキャッシュ
// ユーザー設定が変更されると無効化
const cachedUserPreferences = useMemo(() => {
  return computePreferences(user)
}, [user.settings])
```

---

## コメントのアンチパターン

### コメントアウトされたコード

```typescript
// Bad: コメントアウトされたコードを残さない
function calculate() {
  // const oldMethod = doSomething()
  // const result = processOldWay(oldMethod)
  return newMethod()
}

// Good: 削除する（必要ならgit履歴を使用）
function calculate() {
  return newMethod()
}
```

### 自明なコメント

```typescript
// Bad: 自明なことを述べている
// nameを'John'に設定
name = 'John'

// iを増加
i++

// trueを返す
return true
```

### ジャーナルコメント

```typescript
// Bad: コメントに変更履歴
// 2024-01-05: バリデーションロジックを変更 - John
// 2024-01-10: エッジケースを修正 - Sarah
// 2024-01-15: リファクタリング - Mike
function validate() { }

// Good: 代わりにgitコミット履歴を使用
```

---

## ドキュメントコメント（JSDoc/TSDoc）

パブリックAPIに使用:

```typescript
/**
 * IDでユーザープロフィールを取得
 *
 * @param userId - ユーザーの一意識別子
 * @returns ユーザープロフィールへのPromise、見つからない場合はnull
 * @throws {ValidationError} userIdが無効な場合
 *
 * @example
 * const user = await getUserById('user123')
 */
async function getUserById(userId: string): Promise<User | null> {
  // 実装
}
```

---

## 最終テスト

自問してください:

1. **このコメントを削除して、代わりにコードを自己文書化できる？**
2. **このコメントは何ではなくなぜを説明している？**
3. **このコメントはまだ正確？**

いずれかの答えが不明確な場合、コメントに頼る代わりにコードをリファクタリング。
