---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  コードは、どのチームメンバーでも1分以内に理解できるべきです。
  ミラーの法則（7±2の認知限界）を尊重。明快さが巧妙さに勝ります。
  名前は具体的に、フローは明白に、関数は焦点を絞って。
decision_question: "新しいチームメンバーは、これを1分以内に理解できますか？"
---

# The Art of Readable Code like Dustin Boswell & Trevor Foucher

**デフォルトマインドセット**: コードは理解しやすくあるべき

## 核心哲学

**「コードは他の誰かがそれを理解するのにかかる時間を最小限にするように書かれるべきである」**

- その「他の誰か」は6ヶ月後のあなたかもしれない
- 理解時間 > 書く時間

## 科学的基盤

Millerの法則（7±2）は、人間の認知能力が限られていることを示しています。コードがこれらの限界を超えると：

- 理解時間が指数関数的に増加
- エラー率が倍増
- 精神的疲労が加速

この科学的裏付けは、なぜ可読性のあるコードが重要かを説明します：私たちの脳は文字通り、一度に多くの複雑さを処理できないのです。

→ 可読性のあるコードの背後にある認知科学については [@~/.claude/ja/rules/reference/PRINCIPLES.md](~/.claude/ja/rules/reference/PRINCIPLES.md) を参照

## 主要な実践

### 1. コードを理解しやすくする

#### 誤解されない名前

```typescript
// ❌ 曖昧
results.filter(x => x > LIMIT)  // 以上？より大きい？

// ✅ 明確な意図
results.filter(x => x >= MIN_ITEMS_TO_DISPLAY)
```

#### 具体的 > 抽象的

```typescript
// ❌ 抽象的
processData(data)

// ✅ 具体的
validateUserRegistration(formData)
```

### 2. ループとロジックの簡素化

#### 制御フローを明確に

```typescript
// ❌ 複雑なネスト
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // 何かする
    }
  }
}

// ✅ 早期リターン
if (!user) return
if (!user.isActive) return
if (!user.hasPermission) return
// 何かする
```

#### ネストを最小限に

- ガード句を使用
- 複雑な条件を名前付き関数に抽出
- 早期リターンを優先

### 3. コードの再編成

#### 無関係なサブ問題を抽出

```typescript
// ✅ 各関数が1つのことをする
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser)
}

function isActiveUser(user: User): boolean {
  return user.status === 'active' && user.lastLogin > thirtyDaysAgo()
}
```

#### 一度に1つのタスク

- 関数は1つのことをすべき
- 説明に「と」が必要なら分割する
- 「何を」と「どうやって」を分離

### 4. コードは「明らかに正しい」べき

#### コードを意図のように見せる

```typescript
// ❌ 意図が不明確
const p = products.filter(p => p.price > 0 && p.stock)

// ✅ 意図が明白
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

### 5. 書く前の重要な質問

自問すること：

1. 「これを理解する最も簡単な方法は何か？」
2. 「これを読む人を混乱させるものは何か？」
3. 「意図をもっと明確にできるか？」

## 実践的な適用

### 変数命名

- **具体的 > 一般的**: `data`ではなく`userEmail`
- **検索可能**: `7`ではなく`MAX_RETRY_COUNT`
- **発音可能**: `cstmr`ではなく`customer`

### 関数設計

- **小さく集中**: 5-10行が理想的
- **説明的な名前**: `calc()`ではなく`calculateTotalPrice()`
- **一貫したレベル**: 高レベルと低レベルの操作を混在させない

### コメント

- **何ではなくなぜ**: 仕組みではなく決定を説明
- **更新または削除**: 古いコメントはないよりも悪い
- **コードファースト**: 何を説明する必要があるなら、コードを書き直す

## 最終テスト

**「新しいチームメンバーは1分以内にこれを理解できるか？」**

できなければ、さらに簡素化する。

## AIコードのクセ

AI生成コード（自分のものを含む）をレビューする際、これらの一般的な過度な設計パターンに注意：

### 早すぎる抽象化

```typescript
// ❌ AI生成：単一実装のためのインターフェース
interface UserProcessor {
  process(user: User): ProcessedUser
}

class DefaultUserProcessor implements UserProcessor {
  process(user: User): ProcessedUser {
    return { ...user, processed: true }
  }
}

// ✅ 直接的アプローチ：具体的に始める
function processUser(user: User): ProcessedUser {
  return { ...user, processed: true }
}
// 2番目の実装が現れた時のみインターフェースを追加
```

### シンプルなタスクに対する不要なクラス

```typescript
// ❌ AI生成：手続き的タスクのためのOOP
class CSVReader {
  async read(path: string): Promise<string[][]> {
    const text = await fs.readFile(path, 'utf-8')
    return this.parse(text)
  }

  private parse(text: string): string[][] {
    return text.split('\n').map(line => line.split(','))
  }
}

// ✅ 手続き的アプローチ：一度きりのタスクにはよりシンプル
async function readCSV(path: string): Promise<string[][]> {
  const text = await fs.readFile(path, 'utf-8')
  return text.split('\n').map(line => line.split(','))
}
```

### 想像上の拡張性

```typescript
// ❌ AI生成：シンプルな検証のためのプラグインシステム
class ValidationEngine {
  private validators: Map<string, Validator>

  registerValidator(name: string, validator: Validator) { }
  validate(data: unknown, rules: string[]): Result { }
}

// ✅ 直接的な検証：今必要なものを構築
function validateUser(user: User): ValidationError[] {
  const errors = []
  if (!user.email) errors.push({ field: 'email', message: 'Required' })
  if (user.age < 0) errors.push({ field: 'age', message: 'Invalid' })
  return errors
}
```

### 検出と修正

**危険信号：**

- 具体的なユースケースのない「将来性のある」抽象化
- 単一の関数をラップするクラス
- 解決しない問題に適用されたパターン
- 正確に1回だけ使用されるヘルパー関数

**修正戦略：**

1. オッカムの剃刀を適用 - 抽象化を削除
2. 最も直接的な解決策から始める
3. 以下の場合のみ複雑さを追加：
   - 同じパターンが3回以上現れる（DRY）
   - 複数の実装が**実際に**必要
   - 現在のアプローチが**測定可能に**失敗

## 覚えておくこと

- 明確さは賢さに勝る
- 未来のあなたは別人
- 読むことは書くことよりも多く起こる

## 関連する原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
