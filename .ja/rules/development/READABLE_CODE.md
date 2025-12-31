---
paths: "**/*.{ts,tsx,js,jsx,md}"
summary: |
  コードはどのチームメンバーでも1分以内に理解できるべき。
  ミラーの法則（7±2の認知限界）を尊重。明確さが巧妙さに勝つ。
  名前は具体的、フローは明確、関数は焦点を絞る。
decision_question: "新しいチームメンバーがこれを1分以内に理解できる？"
---

# リーダブルコード - Dustin Boswell & Trevor Foucher風

**デフォルトマインドセット**: コードは理解しやすくあるべき

## コア哲学

**「コードは他の誰かがそれを理解するのにかかる時間を最小化するように書くべき」**

- その「他の誰か」は6ヶ月後のあなたかもしれない
- 理解時間 > 記述時間

## 科学的根拠

ミラーの法則（7±2）は、人間の認知容量が限られていることを示す。コードがこれらの限界を超えると:

- 理解時間が指数関数的に増加
- エラー率が乗算的に増加
- 精神的疲労が加速

この科学的裏付けはリーダブルコードがなぜ重要かを説明する: 私たちの脳は文字通り、一度に多くの複雑さを処理できない。

→ ミラーの法則の閾値については [@~/.claude/skills/applying-code-principles/SKILL.md](~/.claude/skills/applying-code-principles/SKILL.md) を参照

## 主要プラクティス

### 1. コードを理解しやすくする

#### 誤解されない名前

```typescript
// 悪い例: 曖昧
results.filter(x => x > LIMIT)  // より大きい？以上？

// 良い例: 意図が明確
results.filter(x => x >= MIN_ITEMS_TO_DISPLAY)
```

#### 抽象より具体を優先

```typescript
// 悪い例: 抽象的
processData(data)

// 良い例: 具体的
validateUserRegistration(formData)
```

### 2. ループとロジックを簡素化

#### 制御フローを明確に

```typescript
// 悪い例: 複雑なネスト
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // 何かする
    }
  }
}

// 良い例: 早期リターン
if (!user) return
if (!user.isActive) return
if (!user.hasPermission) return
// 何かする
```

#### ネストを最小化

- ガード句を使用
- 複雑な条件を名前の付いた関数に抽出
- 早期リターンを優先

### 3. コードを再編成

#### 無関係なサブ問題を抽出

```typescript
// 良い例: 各関数は1つのことをする
function getActiveUsers(users: User[]) {
  return users.filter(isActiveUser)
}

function isActiveUser(user: User): boolean {
  return user.status === 'active' && user.lastLogin > thirtyDaysAgo()
}
```

#### 一度に1つのタスク

- 関数は1つのことをすべき
- 説明に「かつ」が必要なら、分割する
- 「何を」と「どう」を分離

### 4. コードは「明らかに正しい」べき

#### コードを意図のように見せる

```typescript
// 悪い例: 意図が不明確
const p = products.filter(p => p.price > 0 && p.stock)

// 良い例: 意図が明確
const availableProducts = products.filter(product =>
  product.price > 0 &&
  product.stock > 0
)
```

### 5. 書く前の重要な質問

自問する:

1. 「これを理解する最も簡単な方法は？」
2. 「これを読む人を混乱させるものは？」
3. 「意図をもっと明確にできる？」

## 実践的な適用

### 変数の命名

- **具体 > 汎用**: `data`ではなく`userEmail`
- **検索可能**: `7`ではなく`MAX_RETRY_COUNT`
- **発音可能**: `cstmr`ではなく`customer`

### 関数設計

- **小さく焦点を絞る**: 5-10行が理想
- **説明的な名前**: `calc()`ではなく`calculateTotalPrice()`
- **一貫したレベル**: 高レベルと低レベルの操作を混ぜない

### コメント

- **何ではなくなぜ**: メカニズムではなく決定を説明
- **更新または削除**: 古いコメントはないよりも悪い
- **コード優先**: 何を説明する必要があるなら、コードを書き直す

## 最終テスト

**「新しいチームメンバーがこれを1分以内に理解できる？」**

できないなら、さらに簡素化。

## AIコードの臭い

AI生成コード（自分のものも含む）をレビューするとき、これらの一般的な過剰設計パターンに注意:

**警告サイン:**

- 単一実装のインターフェース
- 単一関数をラップするクラス
- 具体的なユースケースのない「将来対応」抽象化
- 1回だけ使用されるヘルパー関数
- 明確な必要性のないデザインパターン

**修正戦略:**

1. オッカムの剃刀を適用 - 不要な抽象化を削除
2. 最も直接的なソリューションから始める
3. パターンが3回以上出現したときにのみ複雑さを追加

→ **詳細な例と検出チェックリスト**: [@~/.claude/skills/reviewing-readability/references/ai-antipatterns.md](~/.claude/skills/reviewing-readability/references/ai-antipatterns.md)

## 覚えておく

- 明確さが巧妙さに勝つ
- 将来のあなたは別人
- 読むことは書くことより多い

## 関連原則

参照: [@../PRINCIPLE_RELATIONSHIPS.md](../PRINCIPLE_RELATIONSHIPS.md#development-practices)
