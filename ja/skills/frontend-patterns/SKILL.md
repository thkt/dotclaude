---
name: frontend-patterns
description: >
  Reactの豊富な実装例を含むフレームワーク非依存のフロントエンドコンポーネント設計パターン。
  React、Vue、Angularコンポーネント（コンポーネント）を扱う際、パターン
  （パターン）、フックやカスタムフック（カスタムフック）、Container/Presentational分離（分離）、
  状態管理（状態管理）、コンポジション、HOC、render props、フロントエンドアーキテクチャについて
  議論する際に使用。Container/Presentational分離、Reactフックパターン（useEffect、useMemo、useCallback）、
  カスタムフック設計、状態管理戦略、コンポーネントコンポジションをカバー。
  design-pattern-reviewerエージェントとフロントエンド実装に必須。
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
---

# フロントエンドパターン - コンポーネント設計ガイド

## 概要

React実装に重点を置いたフレームワーク非依存のコンポーネント設計パターン。カバー範囲：

1. **Container/Presentational** - ロジック/UI分離（普遍的パターン）
2. **フックパターン** - useEffect、useMemo、useCallbackのベストプラクティス（React固有）
3. **カスタムフック** - ロジックの再利用と設計パターン（React固有）
4. **状態管理** - Context、props、状態の整理（普遍的概念、React例）
5. **コンポーネントコンポジション** - children、render props、HOC（普遍的パターン）

## このスキルを使用するタイミング

### 自動トリガー

このスキルを起動するキーワード：

- React、component、コンポーネント
- pattern、パターン、design
- hooks、custom hook、カスタムフック
- container、presentational、分離
- state management、状態管理
- composition、HOC、render props

### 明示的な呼び出し

確実な起動のため：

- "フロントエンドパターンスキルを適用"
- "コンポーネント設計パターンを使用"
- "Reactパターンを表示"

### 一般的なシナリオ

- コンポーネントアーキテクチャの設計
- `/code`コマンドでの実装
- `design-pattern-reviewer`エージェントでのレビュー
- コンポーネント構造のリファクタリング
- React/Vue/Angularのベストプラクティスの学習

## コアパターン

### 1. Container/Presentationalパターン

**概念**（フレームワーク非依存）：
ロジック（データ取得、状態）をUI（プレゼンテーション）から分離。

**利点**：

- UIコンポーネントが再利用可能
- 個別にテストしやすい
- 関心の明確な分離

**React実装**：

```tsx
// ❌ Avoid: Mixed concerns
export const UserProfile = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/user').then(setUser)
  }, [])
  return <div>{user?.name}</div>
}

// ✅ Good: Separated
// Container (logic)
export const UserProfileContainer = () => {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/user').then(setUser)
  }, [])
  return <UserProfile user={user} />
}

// Presentational (UI only)
export const UserProfile = ({ user }) => (
  <div>{user?.name}</div>
)
```

**Vue実装**（参考用）：

```vue
<!-- Container -->
<script setup>
import { ref, onMounted } from 'vue'
const user = ref(null)
onMounted(() => fetch('/api/user').then(u => user.value = u))
</script>

<!-- Presentational -->
<script setup>
defineProps(['user'])
</script>
<template><div>{{ user?.name }}</div></template>
```

### 2. フックパターン（React固有）

**useEffect依存関係**：

```tsx
// ❌ Avoid: Missing dependencies
useEffect(() => {
  fetchData(userId)
}, []) // Missing userId

// ✅ Good: Complete dependencies
useEffect(() => {
  fetchData(userId)
}, [userId])
```

**useMemoで高コスト計算**：

```tsx
// ❌ Avoid: Recalculated every render
const filtered = items.filter(item => item.active)

// ✅ Good: Memoized
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
)
```

**useCallbackで安定した関数**：

```tsx
// ❌ Avoid: New function every render
<Child onClick={() => handleClick(id)} />

// ✅ Good: Stable reference
const handleClickCallback = useCallback(
  () => handleClick(id),
  [id]
)
<Child onClick={handleClickCallback} />
```

### 3. カスタムフック設計（React固有）

**命名規則**：常に`use`で始める

```tsx
// ✅ Good: Reusable data fetching
function useFetchUser(userId) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(setUser)
      .finally(() => setLoading(false))
  }, [userId])

  return { user, loading }
}

// Usage
const { user, loading } = useFetchUser(userId)
```

### 4. 状態管理

**概念**（普遍的）：

- **ローカル状態**：コンポーネント固有のデータ
- **共有状態**：コンポーネント間で使用されるデータ
- **グローバル状態**：アプリケーション全体のデータ

**React実装**：

```tsx
// Local state (useState)
const [count, setCount] = useState(0)

// Shared state (Context)
const ThemeContext = createContext()
// Provider
<ThemeContext.Provider value={theme}>

// Global state (Context + custom hook)
function useAuth() {
  const context = useContext(AuthContext)
  return context
}
```

**状態の粒度**：

```tsx
// ❌ Avoid: Large state object
const [state, setState] = useState({
  user, posts, comments, settings
})

// ✅ Good: Separate state
const [user, setUser] = useState()
const [posts, setPosts] = useState()
const [comments, setComments] = useState()
```

### 5. コンポーネントコンポジション

**概念**（普遍的）：
シンプルなコンポーネントから複雑なものを構築。

**Reactパターン**：

```tsx
// 1. Children pattern
const Card = ({ children }) => (
  <div className="card">{children}</div>
)

// 2. Render props
const DataProvider = ({ render, data }) => (
  <div>{render(data)}</div>
)

// 3. HOC (Higher-Order Component)
const withAuth = (Component) => (props) => {
  const user = useAuth()
  return user ? <Component {...props} /> : <Login />
}
```

## 詳細な知識ベース

### リファレンスドキュメント

- **[@./references/container-presentational.md]** - スタイル責任を含む完全なContainer/Presentationalパターンガイド

## 統合ポイント

### エージェントとの統合

- **design-pattern-reviewer** - このスキルの原則を使用してReact/フロントエンドパターンをレビュー
- **root-cause-reviewer** - アーキテクチャ問題を特定

### コマンドとの統合

- **/code** - 実装中にパターンを適用
- **/review** - パターン使用を検証

### 統合方法

```yaml
# In agent YAML frontmatter
dependencies: [frontend-patterns]
```

または明示的な参照：

```markdown
[@~/.claude/skills/frontend-patterns/SKILL.md]
```

## クイックスタート

### 新しいコンポーネント向け

1. **Presentationalから始める** - UIのみ、props駆動
2. **Containerを追加** - 必要に応じてロジックでラップ
3. **フックを抽出** - 再利用可能なロジック → カスタムフック
4. **最適化** - パフォーマンスのためuseMemo/useCallback

### リファクタリング向け

1. **混在した関心を特定** - 同じコンポーネント内のロジック + UI
2. **Container/Presentationalを分離**
3. **カスタムフックを抽出** - 共有ロジック
4. **状態を簡素化** - 大きな状態オブジェクトを分割

### コードレビュー向け

1. **分離をチェック** - Container vs Presentational
2. **フックを検証** - 依存関係、メモ化
3. **コンポジションを評価** - 再利用性、柔軟性
4. **状態を評価** - 粒度、管理戦略

## ベストプラクティス

### やるべきこと ✅

- ロジックをUIから分離（Container/Presentational）
- 再利用可能なロジックにカスタムフックを使用
- useEffectで完全な依存配列
- 高コスト計算をメモ化
- 子のprops用に安定したコールバック参照
- Propsのみのプレゼンテーショナルコンポーネント

### やってはいけないこと ❌

- データ取得とUIを混在させる
- JSXでインライン関数（メモ化を破壊）
- 大規模なモノリシックコンポーネント
- useEffectの依存関係の欠落
- 時期尚早な最適化（まず測定）
- ローカル関心事のグローバル状態

## フレームワーク比較

| パターン | React | Vue | Angular |
|---------|-------|-----|---------|
| **Container/Presentational** | 別コンポーネント | Composition API | Smart/Dumbコンポーネント |
| **状態** | useState、Context | ref、reactive | Services、RxJS |
| **副作用** | useEffect | onMounted、watch | ngOnInit、rxjs |
| **コンポジション** | children、render props | slots、scoped slots | ng-content、directives |

**重要な洞察**：パターンは普遍的、実装は異なる。

## 使用しない場合

以下の場合は複雑なパターンをスキップ：

- シンプルな一度だけのコンポーネント
- プロトタイプと実験
- 再利用のないコンポーネント
- 過剰な抽象化（YAGNI）

**ルール**：複雑さを測定。痛みを感じたときにパターンを追加、予測ではない。

## 成功メトリクス

パターンがうまく機能しているとき：

- コンポーネントが簡単にテスト可能
- UIコンポーネントがプロジェクト間で再利用
- ロジックがカスタムフック経由で共有可能
- リファクタリングが関係ないコードを壊さない
- 新しいチームメンバーが構造を迅速に理解

## リソース

### references/

- `container-presentational.md` - 詳細なContainer/Presentationalガイド

### scripts/

現在空（知識のみのスキル）

### assets/

現在空（知識のみのスキル）
