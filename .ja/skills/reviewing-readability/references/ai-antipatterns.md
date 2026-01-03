# AIコードアンチパターン検出

## 時期尚早な抽象化

### 単一実装のためのインターフェース

```typescript
// Bad: AI生成: 不要なインターフェース
interface UserProcessor {
  process(user: User): ProcessedUser
}

class DefaultUserProcessor implements UserProcessor {
  process(user: User): ProcessedUser {
    return { ...user, processed: true }
  }
}

// Good: 直接的なアプローチ
function processUser(user: User): ProcessedUser {
  return { ...user, processed: true }
}

// 2番目の実装が現れた時のみインターフェースを追加
```

**レッドフラグ**: 単一実装のみのインターフェース

---

## シンプルなタスクに対する不要なクラス

### 単純な関数をラップするクラス

```typescript
// Bad: AI生成: OOPの過剰使用
class CSVReader {
  async read(path: string): Promise<string[][]> {
    const text = await fs.readFile(path, 'utf-8')
    return this.parse(text)
  }

  private parse(text: string): string[][] {
    return text.split('\n').map(line => line.split(','))
  }
}

// Good: 手続き的アプローチ
async function readCSV(path: string): Promise<string[][]> {
  const text = await fs.readFile(path, 'utf-8')
  return text.split('\n').map(line => line.split(','))
}
```

**クラスを使うべき場合**:

- 複数の関連操作
- メソッド間で共有状態
- 明確な責任境界

**関数を使うべき場合**:

- 単一操作
- ステートレスな変換
- シンプルなタスク

---

## 想像上の拡張性

### シンプルなロジックに対するプラグインシステム

```typescript
// Bad: AI生成: 過剰設計されたバリデーション
class ValidationEngine {
  private validators: Map<string, Validator>

  registerValidator(name: string, validator: Validator) { }
  validate(data: unknown, rules: string[]): Result { }
}

// Good: 直接的なバリデーション
function validateUser(user: User): ValidationError[] {
  const errors = []
  if (!user.email) errors.push({ field: 'email', message: '必須' })
  if (user.age < 0) errors.push({ field: 'age', message: '無効' })
  return errors
}
```

**レッドフラグ**: 具体的なユースケースのない「将来に備えた」アーキテクチャ

---

## 一度だけ使用されるヘルパー関数

```typescript
// Bad: 不要なヘルパー
function getUserName(user: User): string {
  return user.name
}

function displayUser(user: User) {
  console.log(getUserName(user))  // 一度だけ使用
}

// Good: 直接アクセス
function displayUser(user: User) {
  console.log(user.name)
}
```

**ルール**: ヘルパーを抽出するのは3回以上使用される場合のみ

---

## 問題なしに適用されたパターン

### シンプルな生成に対するファクトリパターン

```typescript
// Bad: 不要なファクトリ
class UserFactory {
  createUser(name: string, email: string): User {
    return { name, email, createdAt: new Date() }
  }
}

// Good: シンプルな関数
function createUser(name: string, email: string): User {
  return { name, email, createdAt: new Date() }
}
```

### 静的ロジックに対するストラテジーパターン

```typescript
// Bad: 過剰設計
interface DiscountStrategy {
  calculate(amount: number): number
}

class RegularDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.1
  }
}

// Good: シンプルな条件分岐
function calculateDiscount(amount: number, userType: string): number {
  if (userType === 'premium') return amount * 0.2
  if (userType === 'regular') return amount * 0.1
  return 0
}
```

**パターンを使うべき場合のみ**:

- 複数の実際の実装が存在
- 実行時に振る舞いを切り替える必要がある
- パターンが実際の問題を解決する

---

## 検出チェックリスト

### レッドフラグ

- [ ] 単一実装のみのインターフェース
- [ ] 1つの関数をラップするクラス
- [ ] ちょうど1回だけ使用されるヘルパー関数
- [ ] 「将来に備えた」抽象化
- [ ] 明確な必要性のないデザインパターン
- [ ] シンプルなタスクに対する複雑なアーキテクチャ

### 修正戦略

1. **オッカムの剃刀を適用**: 不要な抽象化を削除
2. **具体的から始める**: 今必要なものを構築
3. **複雑さを追加するのは以下の場合のみ**:
   - 同じパターンが3回以上出現（DRY原則）
   - 複数の実装が**実際に**必要
   - 現在のアプローチが**測定可能に**失敗

---

## タスクスコープに基づくアプローチ

実際のスコープに基づいて実装を選択:

```typescript
// 単一関数タスク → 直接的な手続き型
async function uploadFile(file: File): Promise<string> {
  const data = await file.arrayBuffer()
  return await storage.put(data)
}

// ファイルレベルのロジック → 最小限の抽象化を持つ関数
function validateUser(user: User) { }
function saveUser(user: User) { }

// モジュールレベル → 以下の場合にクラスを検討:
// - 複数の関連操作
// - 共有状態（接続、キャッシュ）
// - 明確な責任境界

// システムレベル → 以下の場合のみパターンを適用:
// - 複数チームが関与
// - プラグインシステムが必要
// - パブリックAPIサーフェス
```

---

## シンプルさテスト

AI生成コードを受け入れる前に:

1. **これはシンプルな関数にできる？** → そこから始める
2. **このパターンは実際の問題を解決している？** → いいえなら削除
3. **このコードは3ヶ月後も存在する？** → はいならシンプルに保つ

---

## 理解負債チェック

AI生成コードをマージする前に確認:

1. **このコードがなぜ存在するか説明できる？** → 何をしているかではなく、なぜか
2. **ゼロから書くとしたら同じコードを書く？** → いいえならリファクタリング
3. **同じことを達成するもっとシンプルなコードはある？** → オッカムの剃刀を適用

いずれかがNOなら → リファクタリングまたは却下。説明できないコードは負債。

---

## 覚えておくこと

> 「最良のコードはまだ存在する必要のないコード」 - プログレッシブエンハンスメント

**原則**: 手続き型vsOOPは好みの問題ではなく、問題の複雑さにソリューションの複雑さを合わせること。
