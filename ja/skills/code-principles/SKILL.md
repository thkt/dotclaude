---
description: >
  SOLID、DRY、オッカムの剃刀（KISS）、ミラーの法則、YAGNIを含む基本的なソフトウェア開発原則。
  原則、シンプル、複雑、アーキテクチャ、リファクタリング、保守性、コード品質、
  デザインパターン、ベストプラクティス、クリーンコードについて議論する際に使用。
  保守可能で理解しやすいコードを書くための意思決定フレームワークと実践的ガイドラインを提供。
  structure-reviewer、root-cause-reviewer、/codeコマンド実装に不可欠。
allowed-tools: Read, Grep, Glob
---

# コード原則 - 基本的なソフトウェア開発ガイドライン

## 概要

このスキルは、コアとなるソフトウェア開発原則を単一の一貫した知識ベースに統合します。カバー範囲:

1. **SOLID原則** - 依存関係を管理し、変更を可能にする（Uncle Bob）
2. **DRY** - Don't Repeat Yourself、知識の重複を排除（Pragmatic Programmers）
3. **オッカムの剃刀（KISS）** - 最もシンプルな解決策を選ぶ（William of Ockham）
4. **ミラーの法則** - 認知限界7±2を尊重（George Miller）
5. **YAGNI** - You Aren't Gonna Need It（Extreme Programming）

## このスキルを使用するタイミング

### 自動トリガー

このスキルを活性化するキーワード:

- SOLID, DRY, Occam's Razor, KISS
- Miller's Law, YAGNI, principle, 原則
- simplicity, シンプル, complexity, 複雑
- design pattern, architecture, アーキテクチャ
- refactor, リファクタリング
- maintainability, 保守性, code quality, コード品質
- best practice, clean code

### 明示的呼び出し

確実な活性化のため:

- "Apply code principles"（コード原則を適用）
- "Use fundamental software principles"（基本的なソフトウェア原則を使用）
- "Check against SOLID/DRY/YAGNI"（SOLID/DRY/YAGNIに照らして確認）

### 一般的なシナリオ

- アーキテクチャ設計の意思決定
- コードレビューと品質評価
- リファクタリング計画
- 複雑さの評価
- システム設計の議論
- ベストプラクティスの学習

## クイック意思決定の質問

原則を素早く適用するためのこれらの質問を使用:

### オッカムの剃刀 / KISS

**「これを達成するもっとシンプルな方法はあるか？」**

- 最少の依存関係（3個以上より0-2個を推奨）
- より少ないコード行数（関数あたり50行未満を推奨）
- より低い循環的複雑度（分岐5個未満を推奨）

### DRY

**「知識や意図を重複させていないか？」**

- 同じビジネスロジックが複数箇所に？
- 設定値が繰り返されている？
- 単一の真実の情報源があるか？

### SOLID

**「このクラス/モジュールは単一の明確な変更理由を持っているか？」**

- 単一責任の原則（SRP）
- 開放閉鎖の原則（OCP）
- 依存関係の方向をチェック

### ミラーの法則

**「新しいチームメンバーは1分以内に理解できるか？」**

- 関数パラメータ ≤ 5?
- クラスのpublicメソッド ≤ 7?
- 条件分岐 ≤ 5?

### YAGNI

**「これは今存在する実際の問題を解決しているか？」**

- 想像上の未来のために構築している？
- 「念のため」柔軟性を追加している？
- 測定なしに最適化している？

## コア原則概要

### 1. SOLID原則

**目標**: 適切な依存関係管理を通じて、柔軟で保守可能なシステムを作成する。

**5つの原則**:

#### S - 単一責任の原則

クラスは変更する理由を1つだけ持つべき。

```typescript
// ❌ 複数の責任
class User {
  validate(): boolean  // 検証ロジック
  save(): void        // 永続化ロジック
  sendEmail(): void   // 通知ロジック
}

// ✅ 単一責任
class UserValidator { validate(user: User): ValidationResult }
class UserRepository { save(user: User): Promise<void> }
class UserNotifier { sendEmail(user: User): Promise<void> }
```

#### O - 開放閉鎖の原則

拡張に対して開いており、修正に対して閉じている。

```typescript
// ✅ インターフェースを通じて拡張
interface PaymentProcessor {
  process(amount: number): Result
}
class StripeProcessor implements PaymentProcessor {}
class PayPalProcessor implements PaymentProcessor {}
```

#### L - リスコフの置換原則

サブタイプは基本型と置換可能でなければならない。

#### I - インターフェース分離の原則

1つの汎用インターフェースより多くの特定インターフェース。

#### D - 依存性逆転の原則

具象ではなく抽象に依存する。

**完全な詳細**: [@./references/solid.md]

### 2. DRY - Don't Repeat Yourself

**コア哲学**: すべての知識片は、単一の、曖昧さのない、権威ある表現を持たなければならない。

**単なるコードの重複ではない** - 知識の重複について:

```typescript
// ❌ 知識の重複
// バリデーション内: maxLength = 100
// データベース内: VARCHAR(100)
// UI内: maxlength="100"

// ✅ 単一の真実の情報源
const LIMITS = { username: 100 }
// すべての場所でLIMITSを使用
```

**3の法則**: 重複を2回見た？メモする。3回見た？リファクタリングする。

**完全な詳細**: [@./references/dry.md]

### 3. オッカムの剃刀（KISS）

**コア哲学**: 問題を解決する最もシンプルな解決策が通常最良の解決策。

**KISS**: Keep It Simple, Stupid - 同じ原則、覚えやすい頭字語。

**意思決定フレームワーク**:

1. すべての実行可能な解決策をリストアップ
2. 要件を満たす最もシンプルなものを選択
3. すべての抽象化に疑問を持つ - 本当に必要か？

```typescript
// ❌ 不必要に複雑
class UserAuthenticationManager {
  private strategies: Map<string, AuthStrategy>
  // 50行の抽象化
}

// ✅ シンプルで十分
function authenticate(username: string, password: string): boolean {
  const user = findUser(username)
  return user && verifyPassword(password, user.passwordHash)
}
```

**完全な詳細**: [@./references/occams-razor.md]

### 4. ミラーの法則

**コア哲学**: 人間の心は短期記憶に約7±2項目を保持できる。

**科学的基盤**: この認知限界は深い影響を持つ:

- 理解時間は7±2項目を超えると指数的に増加
- エラー率は複雑さとともに倍増
- 精神的疲労が加速

**推奨される制限**:

- 関数パラメータ: 理想3、最大5
- クラスのpublicメソッド: 最大7
- 条件分岐: 最大5
- 関数の長さ: 5-15行

```typescript
// ❌ 認知過負荷 - 9パラメータ
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ 認知限界を尊重 - 3つのグループ化されたパラメータ
function createUser(
  identity: UserIdentity,
  contact: ContactInfo,
  location: LocationInfo
) { }
```

**完全な詳細**: [@./references/millers-law.md]

### 5. YAGNI - You Aren't Gonna Need It

**コア哲学**: 実際に必要になるまで機能を追加しない。

**実装フェーズ**（必要になった時のみ各フェーズを追加）:

1. **動くようにする** - 直近の問題を解決
2. **強靭にする** - エラーが発生した時にエラーハンドリングを追加
3. **速くする** - 遅さが測定された時に最適化
4. **柔軟にする** - ユーザーが要求した時にオプションを追加

**意思決定フレームワーク**:
コードを追加する前に問う:

- これは今存在する実際の問題を解決しているか？
- これは実際に本番環境で失敗したか？
- ユーザーはこれについて不満を言ったか？
- 問題の測定された証拠があるか？

「いいえ」なら → まだ追加しない

```typescript
// ❌ YAGNI違反 - 時期尚早な抽象化
interface PaymentProcessor {
  process(amount: number): Promise<Result>
}
class StripePaymentProcessor implements PaymentProcessor { }
// 他のプロセッサは存在せず、計画もない

// ✅ YAGNI準拠
async function processPayment(amount: number) {
  return stripe.charge(amount)
}
// 2番目のプロセッサが実際に必要になった時にインターフェースを追加
```

**完全な詳細**: [@./references/yagni.md]

## 原則の相互作用

### 原則がどのように連携するか

```markdown
YAGNI + オッカムの剃刀:
  「今日の問題のみを解決する最もシンプルなものを構築」

DRY + SOLID (SRP):
  「各責任に対する単一の真実の情報源」

ミラーの法則 + オッカムの剃刀:
  「認知限界内のシンプルさ」

SOLID (DIP) + DRY:
  「抽象化が知識の重複を防ぐ」

YAGNI + TDD:
  「テスト駆動開発は自然にYAGNIを強制する」
```

### 原則の優先順位

原則が衝突する時:

1. **Safety First** - セキュリティやデータ整合性を決して妥協しない
2. **YAGNI** - 必要のないものを構築しない（多くの衝突を排除）
3. **オッカムの剃刀** - 残りの選択肢の中で最もシンプルな解決策を選ぶ
4. **SOLID** - 複雑なシステムで依存関係を管理する時に適用
5. **DRY** - 重複を排除するが、明快さを犠牲にしない
6. **ミラーの法則** - 常に認知限界を尊重

## 詳細な知識ベース

### 参照ドキュメント

- **[@./references/solid.md]** - Uncle Bobの方法論による完全なSOLID原則ガイド
- **[@./references/dry.md]** - Pragmatic Programmersのアプローチによるdon't Repeat Yourself
- **[@./references/occams-razor.md]** - KISS、タスクスコープガイダンス付きのシンプルさ原則
- **[@./references/millers-law.md]** - 科学的基盤による認知限界（7±2）
- **[@./references/yagni.md]** - 成果重視開発によるYou Aren't Gonna Need It

## 統合ポイント

### Agentsとの統合

- **structure-reviewer** - SOLID、DRY原則に対してコード構成を評価
- **root-cause-reviewer** - これらの原則を使用して根本的な設計問題を特定
- **readability-reviewer** - 認知負荷評価にミラーの法則を適用
- **design-pattern-reviewer** - オッカムの剃刀、SOLIDに対してパターン使用を検証

### Commandsとの統合

- **/code** - 実装中に原則を適用（特にYAGNI、TDD）
- **/audit** - 原則への準拠を検証
- **/think** - アーキテクチャ計画に原則を使用

### 統合方法

```yaml
# AgentのYAMLフロントマターで
dependencies: [code-principles]
```

または明示的参照:

```markdown
[@~/.claude/skills/code-principles/SKILL.md]
```

## クイックスタート

### 新機能設計の場合

1. **YAGNI First** - 今どんな問題が存在するか？
2. **オッカムの剃刀** - 最もシンプルな解決策は何か？
3. **ミラーの法則** - チームは1分以内に理解できるか？
4. **SOLID (SRP)** - 各コンポーネント、1つの責任
5. **DRY** - 各概念に対する単一の真実の情報源

### リファクタリングの場合

1. **違反を特定** - どの原則が破られているか？
2. **SOLID** - 責任は明確か？
3. **DRY** - 知識が重複しているか？
4. **オッカムの剃刀** - シンプルにできるか？
5. **ミラーの法則** - 認知負荷を減らす

### コードレビューの場合

1. **ミラーの法則** - 1分以内に理解できるか？
2. **YAGNI** - この複雑さは今必要か？
3. **DRY** - 知識の重複はないか？
4. **オッカムの剃刀** - よりシンプルな代替案は存在するか？
5. **SOLID** - 依存関係は適切に管理されているか？

## ベストプラクティス

### すべきこと ✅

- **シンプルから始める** - オッカムの剃刀とYAGNIをまず適用
- **認知限界を尊重** - ミラーの法則の制約に従う
- **重複を排除** - 単なるコードではなく知識にDRYを適用
- **単一責任** - 複雑なシステムにSOLID原則
- **証拠ベースの意思決定** - YAGNIは測定を要求

### してはいけないこと ❌

- **過度な抽象化** - YAGNI違反
- **7±2制限の違反** - ミラーの法則違反
- **知識の重複** - DRY違反
- **責任の混在** - SOLID (SRP)違反
- **想像上の未来のための構築** - YAGNI違反

## 成功の指標

原則が機能している時:

- コードが容易にテスト可能（SOLID、オッカムの剃刀）
- 新しいチームメンバーが素早く理解（ミラーの法則、オッカムの剃刀）
- 変更が無関係なコードを壊さない（SOLID、DRY）
- リファクタリングが安全に感じられる（すべての原則）
- 速度が時間とともに向上（YAGNI、オッカムの剃刀）

## 適用すべきでない時

### 複雑なパターンをスキップすべき場合

- プロトタイプと実験（YAGNI）
- シンプルな使い捨てスクリプト（オッカムの剃刀）
- 明らかにシンプルな解決策（すべての原則がシンプルさを支持）

### 常に適用

- セキュリティ懸念（Safety FirstがYAGNIを上書き）
- データ整合性（Safety First）
- 認知限界（ミラーの法則）

**ルール**: 迷ったらシンプルから始める。証拠が要求する時のみ複雑さを追加。

## リソース

### references/

各原則の完全なドキュメント:

- `solid.md` - 例付きの5つのSOLID原則
- `dry.md` - Don't Repeat Yourself方法論
- `occams-razor.md` - KISS付きのシンプルさ原則
- `millers-law.md` - 認知限界（7±2）の科学的基盤
- `yagni.md` - 意思決定フレームワーク付きのYou Aren't Gonna Need It

### scripts/

現在空（知識のみのスキル）

### assets/

現在空（知識のみのスキル）
