# Claude Code 実践ワークフロー Part 4

## /code で TDD/RGRC 実装する

> **対象読者**: Claude Code を既に導入している開発チーム

「コードを書いたけど、動くか不安…」—— テストなしで実装を進めていませんか？この記事では、`/code` コマンドで **TDD（テスト駆動開発）** と **RGRC サイクル**を使った確実な実装方法を紹介します。

> **Part 1-3 未読の方へ**
>
> - **Part 1**: Commands / Agents / Skills の三層構造
> - **Part 2**: `/research` でコードベースを調査
> - **Part 3**: `/think` で SOW + Spec を生成
>
> `/code` は `/think` で生成した **spec.md** を参照しながら実装を進めます。

---

## 課題: テストなしの実装は不安定

「動いてるっぽい」で終わらせていませんか？

- 実装後に「あれ、壊れてる」と気づく
- 変更の影響範囲がわからない
- リファクタリングが怖くてできない

結果、**技術的負債が蓄積し、開発速度が低下**。

**解決策**: `/code` で TDD/RGRC サイクルを回し、テストに守られた実装を行う。

---

## /code の役割: TDD で「動作するきれいなコード」

`/code` は **RGRC サイクル**（Red-Green-Refactor-Commit）で実装を進めます：

`/code "ユーザー認証機能を実装"`

**Phase 0: spec.md からテスト生成**（test-generator）

- FR-001 → test: "POST /auth/login でJWTを発行"
- FR-002 → test: "Authorization ヘッダーでトークン検証"

↓

**RGRC サイクル**（各テストごとに繰り返し）

| フェーズ | 内容 |
|---------|------|
| 🔴 Red | テストを書く（失敗する） |
| 🟢 Green | 最小限のコードで通す |
| 🔵 Refactor | SOLID/DRY を適用して整理 |
| ✅ Commit | 安定状態を保存 |

**ゴール**: "Clean code that works"（動作するきれいなコード）— Ron Jeffries

---

## Phase 0: spec.md からテスト生成

`/think` で生成した spec.md の **Test Scenarios** から、自動的にテストコードを生成します：

### spec.md のテストシナリオ

```markdown
## 7. Test Scenarios
describe('認証', () => {
  it('[✓] 正しい認証情報でログインできる');
  it('[✓] 無効なトークンで401が返る');
  it('[→] 期限切れトークンで401が返る');
});
```

### 生成されるテストコード

```typescript
// test-generator が自動生成
describe('認証', () => {
  it('[✓] 正しい認証情報でログインできる', async () => {
    // Given
    const credentials = { email: 'test@example.com', password: 'password' };
    // When
    const response = await request(app).post('/auth/login').send(credentials);
    // Then
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  // ... 他のテストも同様に生成
});
```

**効果**: 仕様と実装の乖離を防ぎ、TDD サイクルをすぐに開始できる。

> **Note**: Phase 0 は spec.md が存在する場合に自動実行されます。spec.md がない場合、`/code` は直接 RGRC サイクルに入ります。

---

## RGRC サイクル: 4フェーズの実装ループ

### 🔴 Red Phase: 失敗するテストを書く

```bash
npm test -- --testNamePattern="正しい認証情報でログインできる"
# ❌ FAIL: Cannot find module './auth'
```

**目的**: テストが「正しい理由で」失敗することを確認。

**所要時間**: 約30秒

### 🟢 Green Phase: 最小限のコードで通す

```typescript
// 最小限の実装（まだ汚くてOK）
export async function login(email: string, password: string) {
  if (email === 'test@example.com' && password === 'password') {
    return { token: 'dummy-token' };
  }
  throw new Error('Invalid credentials');
}
```

```bash
npm test -- --testNamePattern="正しい認証情報でログインできる"
# ✅ PASS
```

**目的**: テストを通すことだけに集中。コードの美しさは後。

**所要時間**: 約1分

### 🔵 Refactor Phase: SOLID/DRY を適用

```typescript
// SOLID/DRY を適用してリファクタリング
export class AuthService {
  constructor(private userRepository: UserRepository) {}

  async login(email: string, password: string): Promise<AuthToken> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || !await this.verifyPassword(password, user.passwordHash)) {
      throw new InvalidCredentialsError();
    }
    return this.generateToken(user);
  }
}
```

```bash
npm test
# ✅ All tests still passing
```

**目的**: テストが通る状態を維持しながら、コードを整理。

**所要時間**: 約1-2分

### ✅ Commit Phase: 安定状態を保存

```bash
git add .
git commit -m "feat: ユーザーログイン機能を実装"
```

**目的**: 動作する状態をこまめに保存し、いつでも戻れるようにする。

> **Note**: `/code` はコミットを自動実行しません。ユーザーがコミットタイミングを制御します。

---

## Baby Steps: 小さく進む

TDD の核心は **Baby Steps**（小さな一歩）です：

### なぜ Baby Steps が重要か？

| 大きなステップ | 小さなステップ（Baby Steps） |
|---------------|------------------------------|
| 一度に複数の変更 | 1つずつ変更 |
| 失敗時に原因特定が困難 | 最後の変更が原因 |
| 30分後にテストが通る | 2分ごとにテストが通る |
| リスク大 | リスク小 |

### Baby Steps の実践例

```typescript
// ❌ 大きなステップ: 一度に全部実装
function calculateTotal(items, tax, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + tax) * (1 - discount);
}

// ✅ Baby Steps: 一つずつ
// Step 1: まず0を返す（最小限）
function calculateTotal(items) { return 0; }

// Step 2: 合計だけ計算
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Step 3: 税を追加（次のテストが要求したら）
function calculateTotal(items, tax) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return subtotal * (1 + tax);
}
```

### Baby Steps のリズム

| ステップ | 作業 | 所要時間 |
|----------|------|----------|
| 1 | 最小の失敗テストを書く | 30秒 |
| 2 | 最小のコードで通す | 1分 |
| 3 | テスト実行 | 10秒 |
| 4 | 小さなリファクタ | 30秒 |
| 5 | コミット（グリーンなら） | 20秒 |
| **合計** | | **約2分/サイクル** |

---

## spec.md との連携: 仕様駆動実装

`/code` は自動的に最新の spec.md を参照します：

`/think` で生成 → **spec.md** → `/code` が自動参照

**spec.md の内容**:

- FR-001〜003: 機能要件
- API Specification: エンドポイント仕様
- Test Scenarios: テストケース
- Implementation Checklist: 進捗管理

**実装時の活用**:

| spec.md セクション | /code での活用 |
|-------------------|---------------|
| FR-xxx | 何を実装するか |
| API Spec | リクエスト/レスポンス構造 |
| Test Scenarios | テストコード生成 |
| Checklist | TodoWrite で進捗追跡 |

### TodoWrite による進捗管理

spec.md の **Implementation Checklist** は、`/code` 実行時に自動的に TodoWrite に登録されます：

| タスク | ステータス |
|--------|-----------|
| User モデル作成 | in_progress |
| /auth/login 実装 | pending |
| JWT ミドルウェア作成 | pending |
| テスト実装 | pending |

RGRC サイクルが進むたびに、対応する Todo が `completed` に更新されます。

**効果**: 仕様と実装の一貫性を保証。「仕様にあるのに実装忘れ」を防止。

---

## 品質チェック: 並列実行

RGRC サイクル中、品質チェックが**並列実行**されます：

**Quality checks in progress** — Score: 92% | Confidence: HIGH

| チェック | 結果 |
|---------|------|
| 🧪 Tests | ✅ 45/45 passing |
| 📊 Coverage | ⚠️ 78% (Target: 80%) |
| 🔍 Lint | ✅ 0 errors, 2 warnings |
| 🔷 TypeCheck | ✅ All types valid |
| 🎨 Format | ✅ Formatted |

### 品質ゲート

| チェック | 閾値 | 失敗時のアクション |
|----------|------|-------------------|
| テスト | 全パス | 失敗テストを修正 |
| カバレッジ | 80%以上 | テストを追加 |
| Lint | エラー0 | 自動修正または手動修正 |
| 型チェック | エラー0 | 型エラーを修正 |

> **Tip**: 品質ゲートの閾値はプロジェクトの `package.json` や設定ファイルから自動検出されます。カスタム設定が必要な場合は、プロジェクトルートの `.claude/CLAUDE.md` に記載できます。

---

## 使い方の具体例

### 例1: 基本的な実装

```bash
/code "ユーザー登録機能を実装"
```

→ spec.md があれば自動参照、TDD サイクルで実装

### 例2: 高信頼度が必要な場合

```bash
/code --confidence 0.9 "決済処理を実装"
```

→ 信頼度90%以上でないと実装を進めない（重要機能向け）

### 例3: 軽微な変更

```bash
/code --fast "ボタンの色を変更"
```

→ 一部の品質チェックをスキップ（低リスク変更向け）

---

## Part 2-3 との連携: ワークフロー

```mermaid
flowchart LR
    A[/research] -.-> B[/think]
    B --> C[SOW + spec.md]
    C --> D[/code]
    D --> E[Phase 0: テスト生成]
    E --> F[RGRC サイクル]
    F --> G[品質チェック]
    G --> H[/audit]
```

> **Note**: `/research` はオプション。不慣れなコードベースでは先に実行。

**使い分け**:

| 状況 | 推奨フロー |
|------|-----------|
| 新機能開発 | `/think` → `/code` → `/audit` |
| 不慣れなコードベース | `/research` → `/think` → `/code` |
| バグ修正 | `/fix` |

---

## FAQ

### Q: テストなしで実装を進めたい場合は？

`--fast` オプションで一部チェックをスキップできますが、**推奨しません**。

```bash
/code --fast "緊急の修正"
```

代わりに `/fix` の使用を検討してください。

### Q: spec.md がない場合は？

- 要件が明確なら、そのまま `/code` で実装可能
- 複雑な機能なら、先に `/think` で spec.md を生成することを推奨

### Q: コミットはいつすべき？

**RGRC サイクルごと**（Green になったタイミング）が理想です。

| フェーズ | 状態 | コミット |
|---------|------|---------|
| 🔴 Red | テスト失敗 | - |
| 🟢 Green | テスト成功 | **← ここでコミット** |
| 🔵 Refactor | リファクタ後もテスト成功 | ← ここでもコミット可 |

### Q: 品質ゲートで失敗したら？

**❌ Coverage dropped below 80%**

| アクション | 推奨度 |
|-----------|--------|
| テストを追加 | ✅ 推奨 |
| カバレッジ対象外にする | ❌ 非推奨 |

> Proceeding without resolution? (y/N)

ユーザーに確認を求めます。原則として**修正してから進める**ことを推奨。

---

## 次回予告

**Part 5: 品質フェーズ - /audit でコードレビューする**

実装が完了したら、`/audit` で専門エージェントによる多角的なコードレビューを実行する方法を紹介します。

---

## リポジトリ

設定ファイルの全体はこちらで公開しています。

**GitHub**: <https://github.com/thkt/claude-config>

---

*Claude Code 実践ワークフロー シリーズ*

- [Part 1: 三層設計](./part1-three-layer-architecture.md)
- [Part 2: 調査フェーズ（/research）](./part2-research-investigation.md)
- [Part 3: 計画フェーズ（/think）](./part3-think-sow-spec.md)
- **Part 4: 実装フェーズ（/code）** ← 今回
- [Part 5: 品質フェーズ（/audit）](./part5-review-quality.md)
- [Part 6: 横断的関心事（PRE_TASK_CHECK）](./part6-pre-task-check.md)
