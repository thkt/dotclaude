# 漏れのある抽象化の法則 like Joel Spolsky

**核心原則**: 「すべての重要な抽象化は、ある程度、漏れている」

## 核心哲学

抽象化は簡素化を意図していますが、必然的に根底にある複雑さを露呈します。**この現実を受け入れ、それに応じて設計しましょう。**

目標は完璧な抽象化を作ることではなく：

- **漏れが発生する場所を認識する**
- **漏れが起きた時の計画を立てる**
- **抽象化をできるだけシンプルに保つ**
- **いつ抽象化を突破すべきか知る**

## 完璧な抽象化の問題

```typescript
// ❌ 幻想：「SQLを知る必要はない」
const users = await User.findAll({
  where: { active: true },
  include: ['posts', 'comments']
})

// ✅ 現実：パフォーマンスがSQLの知識を強制
const users = await db.raw(`
  SELECT u.*, COUNT(p.id) as posts
  FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
  WHERE u.active = true
  GROUP BY u.id
`)
```

抽象化が漏れました。結局SQLの知識が必要でした。

## 一般的な漏れのある抽象化

### 1. ORM

```typescript
// ❌ 抽象化が完全だと信じる
async getActiveUsers() {
  return User.findAll({ where: { active: true }})
  // 隠蔽：N+1クエリ、SQL制御なし
}

// ✅ 漏れを認識
async getActiveUsers() {
  return simpleQuery
    ? User.findAll({ where: { active: true }})
    : this.db.raw(optimizedQuery)
}
```

### 2. ネットワーク呼び出し

```typescript
// ❌ ネットワーク呼び出しをローカルのように扱う
async function getUser(id: string) {
  return api.users.get(id)
}

// ✅ ネットワークの現実を認識
async function getUser(id: string) {
  try {
    return await withTimeout(api.users.get(id), 5000)
  } catch (error) {
    if (isNetworkError(error)) {
      return retry(() => api.users.get(id))
    }
    throw error
  }
}
```

### 3. クロスプラットフォームコード

```typescript
// ❌ プラットフォームの違いを無視
const filePath = `${dir}/${filename}`

// ✅ プラットフォームを意識
import path from 'path'
const filePath = path.join(dir, filename)
```

## 漏れを考慮した設計

### 1. プログレッシブな抽象化

```typescript
class DataService {
  // レベル1：シンプルなケース（80%）
  async findUsers(criteria: Simple) {
    return this.orm.findAll(criteria)
  }

  // レベル2：複雑なケース
  async findUsersRaw(sql: string) {
    return this.db.raw(sql)  // 脱出ハッチ
  }
}
```

### 2. 脱出ハッチの提供

```typescript
class CacheLayer {
  async get(key: string) {
    return this.redis.get(key)
  }

  // 抽象化が壊れた時の脱出ハッチ
  get rawClient() {
    return this.redis
  }
}
```

### 3. 境界の文書化

```typescript
/**
 * 抽象化の限界：
 * - 最大レスポンス：5MB
 * - タイムアウト：30秒
 * バルク操作にはbulkFetchUsers()を使用
 */
async function fetchUser(id: string) {
  // 実装
}
```

## 抽象化を突破すべき時

### パフォーマンス要件

```typescript
// 遅すぎる：5秒
await orm.findAll({ include: ['author', 'tags'] })

// 突破：100ms
await db.raw('SELECT * FROM posts...')
```

## 漏れのある抽象化の管理ガイドライン

### 抽象化を層にする

```markdown
高レベル（ビジネスロジック）
    ↓
中レベル（サービス層）← ほとんどのコードはここ
    ↓
低レベル（直接アクセス）← 脱出ハッチ
```

### 抽象化の健全性を監視

抽象化が漏れすぎている兆候：

- 常に脱出ハッチを使用
- 全員が実装の詳細を知る必要がある
- 通常のケースよりエッジケースが多い

### スタックを知る

- **1レベル下を理解**：Reactを使うならDOMを理解
- **失敗モードを学ぶ**：ORMがどう失敗するか知る
- **エッジケースを研究**：フレームワークを壊すものは何か

## 他の原則との統合

### プログレッシブエンハンスメント

- シンプルな抽象化から始める
- 漏れが現れたときだけ複雑さを追加

### オッカムの剃刀

- シンプルな漏れのある抽象化 > 複雑な「完璧な」抽象化

### YAGNI

- 想像上のニーズのために抽象化層を追加しない
- 実際に漏れが起きるまで待つ

## 実践的な適用

### コンポーネントライブラリ

```tsx
// ✅ 脱出ハッチを提供
function Button({
  children,
  onClick,
  className,      // スタイル用脱出ハッチ
  ...restProps    // DOMプロップス用脱出ハッチ
}) {
  return (
    <button
      className={cn('btn-default', className)}
      onClick={onClick}
      {...restProps}
    >
      {children}
    </button>
  )
}
```

## 覚えておくこと

> 「漏れのある抽象化の法則は、誰かが素晴らしい新しいコード生成ツールを思いつくたびに、多くの人が『まず手動でやり方を学び、それから時間を節約するために素晴らしいツールを使え』と言うのを聞くことを意味する。」 - Joel Spolsky

**重要なポイント**：

- すべての抽象化は漏れる - それを計画する
- 抽象化の1レベル下を知る
- 脱出ハッチを提供する
- 境界を文書化する
- プログレッシブエンハンスメントは抽象化にも適用される

## 関連する原則

### 開発実践

- [@./PROGRESSIVE_ENHANCEMENT.md] - 抽象化を段階的に構築
- [@./LAW_OF_DEMETER.md] - 抽象化の境界を管理

### 核心原則

- [@../reference/OCCAMS_RAZOR.md] - シンプルな漏れのある抽象化 > 複雑な「完璧な」もの
- [@../reference/SOLID.md] - DIPは漏れのある抽象化を考慮すべき
