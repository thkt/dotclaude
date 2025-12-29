---
name: reviewing-testability
description: >
  TypeScript/Reactアプリケーションのテスト可能なコード設計パターン。
  Triggers: テスタビリティ, testability, テスト可能, テストしやすい,
  モック, mock, 純粋関数, pure function, 依存性注入, dependency injection, DI,
  副作用, side effect, 副作用分離, テスト困難, hard to test.
allowed-tools: Read, Grep, Glob, Task
---

# テスタビリティレビュー - テストしやすいコード設計

目標: 複雑なモックやセットアップなしでテストしやすいコード。

## テスタビリティ指標

| 指標 | 良好 | 警告 |
| --- | --- | --- |
| モックの複雑さ | シンプルなスタブ | 深いモックチェイン |
| テストセットアップ | < 10行 | > 30行 |
| 依存関係 | 明示的（params/props） | 隠れている（imports） |
| 副作用 | 分離されている | ロジックと混在 |
| 状態 | 予測可能 | グローバル/可変 |

## セクション別ロード

| セクション | ファイル | フォーカス | トリガー |
| --- | --- | --- | --- |
| DI | `references/dependency-injection.md` | 注入可能な依存関係 | 依存性注入, DI, mock |
| Pure | `references/pure-functions.md` | 純粋関数、副作用分離 | 純粋関数, 副作用 |
| Mock対応 | `references/mock-friendly.md` | インターフェース、ファクトリーパターン | モック, テスト困難 |

## クイックチェックリスト

### アーキテクチャ

- [ ] 依存関係が注入可能（ハードコードされたimportでない）
- [ ] 純粋コードと不純コードの明確な分離
- [ ] 外部サービスにインターフェースが定義されている

### コンポーネント

- [ ] プレゼンテーショナルコンポーネントが純粋（props入力、JSX出力）
- [ ] イベントハンドラがテスト用に抽出可能
- [ ] 副作用がhooks/containersに分離

### 状態管理

- [ ] グローバルな可変状態がない
- [ ] 状態更新が予測可能（reducers、純粋関数）
- [ ] テスト用に状態を簡単に初期化できる

## キー原則

| 原則 | 適用 |
| --- | --- |
| DIP（SOLID） | 具象ではなく抽象に依存 |
| 純粋関数 | 同じ入力 = 同じ出力、副作用なし |
| 明示的な依存関係 | 依存関係をパラメータとして渡す |
| 単一責任 | テストする理由は1つ、モックするものは1つ |

## よくあるパターン

### 依存性注入

```typescript
// ❌ テスト困難: 直接依存
class UserService {
  async getUser(id: string) {
    return fetch(`/api/users/${id}`).then(r => r.json())
  }
}

// ✅ テスト可能: 注入可能な依存関係
interface HttpClient {
  get<T>(url: string): Promise<T>
}

class UserService {
  constructor(private http: HttpClient) {}
  async getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`)
  }
}
```

### 純粋関数

```typescript
// ❌ テスト困難: ロジックと副作用が混在
function calculateDiscount(userId: string) {
  const history = api.getPurchaseHistory(userId) // 副作用
  return history.length > 10 ? 0.2 : 0.1
}

// ✅ テストしやすい: 純粋関数
function calculateDiscount(purchaseCount: number): number {
  return purchaseCount > 10 ? 0.2 : 0.1
}
```

### プレゼンテーショナルコンポーネント

```typescript
// ❌ テスト困難: 内部状態とエフェクト
function SearchBox() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  useEffect(() => { api.search(query).then(setResults) }, [query])
  return <div>...</div>
}

// ✅ テストしやすい: 制御されたコンポーネント
interface SearchBoxProps {
  query: string
  results: SearchResult[]
  onQueryChange: (query: string) => void
}

function SearchBox({ query, results, onQueryChange }: SearchBoxProps) {
  return (
    <div>
      <input value={query} onChange={e => onQueryChange(e.target.value)} />
      <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>
    </div>
  )
}
```

## 参照

### コア原則

- [@~/.claude/skills/applying-code-principles/SKILL.md](../../../skills/applying-code-principles/SKILL.md) - 依存性逆転の原則
- [@~/.claude/skills/applying-code-principles/SKILL.md](../../../skills/applying-code-principles/SKILL.md) - テスト困難ならシンプルに

### 関連スキル

- `generating-tdd-tests` - TDDプロセスとテスト生成
- `reviewing-type-safety` - 型がテスタビリティを向上

### 使用するエージェント

- `testability-reviewer` - このスキルの主な利用者
