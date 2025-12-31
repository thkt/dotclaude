# 症状パターン - よくある症状→根本原因マッピング

## タイミングとレースコンディション

### 症状: DOMを待つためのsetTimeout

```typescript
// Bad: 症状への修正
useEffect(() => {
  setTimeout(() => {
    document.getElementById('modal')?.focus()
  }, 100) // マジックナンバー、信頼性が低い
}, [])
```

**根本原因**: Reactのレンダリングライフサイクルを正しく使用していない

```typescript
// Good: 根本原因の修正
const modalRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  modalRef.current?.focus()
}, [])
```

### 症状: 二重実行を防ぐフラグ

```typescript
// Bad: 症状への修正
let hasRun = false
function init() {
  if (hasRun) return
  hasRun = true
  // ...
}
```

**根本原因**: React StrictModeまたは不適切なeffectクリーンアップにより関数が複数回呼び出される

```typescript
// Good: 根本原因の修正
useEffect(() => {
  const controller = new AbortController()
  fetchData(controller.signal)
  return () => controller.abort()
}, [])
```

## ステート管理

### 症状: ステートを同期するための複数のeffect

```typescript
// Bad: 症状への修正
const [items, setItems] = useState([])
const [filteredItems, setFilteredItems] = useState([])
const [count, setCount] = useState(0)

useEffect(() => {
  setFilteredItems(items.filter(i => i.active))
}, [items])

useEffect(() => {
  setCount(filteredItems.length)
}, [filteredItems])
```

**根本原因**: 派生ステートを独立したステートとして扱っている

```typescript
// Good: 根本原因の修正
const [items, setItems] = useState([])
const filteredItems = useMemo(() => items.filter(i => i.active), [items])
const count = filteredItems.length
```

### 症状: prop変更後にステートを更新するuseEffect

```typescript
// Bad: 症状への修正
function Component({ value }) {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value) // propをステートに同期
  }, [value])
}
```

**根本原因**: propsをミラーリングする不要な内部ステート

```typescript
// Good: 根本原因の修正 - propを直接使用
function Component({ value }) {
  // valueを直接使用、ステート不要
}

// または変換が必要な場合
function Component({ value }) {
  const transformedValue = useMemo(() => transform(value), [value])
}
```

## コンポーネント間通信

### 症状: 子のステート/メソッドにアクセスするref

```typescript
// Bad: 症状への修正
const childRef = useRef()
function handleSubmit() {
  const value = childRef.current.getValue()
  submit(value)
}
```

**根本原因**: 不適切なデータフロー（子が親にステートを報告すべき）

```typescript
// Good: 根本原因の修正
const [value, setValue] = useState('')
function handleSubmit() {
  submit(value)
}
return <Child value={value} onChange={setValue} />
```

### 症状: 兄弟間通信のためのイベントバスまたはグローバルステート

```typescript
// Bad: 症状への修正
// コンポーネントA
eventBus.emit('dataChanged', data)

// コンポーネントB
useEffect(() => {
  eventBus.on('dataChanged', handleData)
  return () => eventBus.off('dataChanged', handleData)
}, [])
```

**根本原因**: ステートを共通の親にリフトアップすべき

```typescript
// Good: 根本原因の修正
function Parent() {
  const [data, setData] = useState()
  return (
    <>
      <ComponentA onDataChange={setData} />
      <ComponentB data={data} />
    </>
  )
}
```

## パフォーマンス

### 症状: すべてをメモ化する

```typescript
// Bad: 症状への修正
const value = useMemo(() => a + b, [a, b]) // 単純な加算をメモ化
const callback = useCallback(() => {}, []) // 理由なくメモ化
```

**根本原因**: プロファイリングなしの時期尚早な最適化

```typescript
// Good: 根本原因の修正
const value = a + b // 単純な計算、メモ不要
// メモ化するのは以下の場合のみ:
// 1. プロファイラーが遅いと示す
// 2. メモ化された子に渡す
// 3. 依存配列で使用
```

### 症状: 至る所でthrottle/debounce

```typescript
// Bad: 症状への修正
const handleScroll = useMemo(
  () => throttle(() => updatePosition(), 100),
  []
)
```

**根本原因**: 多くの場合、根本的なアプローチが間違っている

```typescript
// Good: 根本原因の修正 - CSSまたは適切なイベントを使用
// CSS: position: sticky
// スクロールリスナーの代わりにIntersectionObserver
// アニメーションにはrequestAnimationFrame
```

## CSSタスクのためのJavaScript

### 症状: 表示/非表示のためのJavaScript

```typescript
// Bad: 症状への修正
const [isVisible, setIsVisible] = useState(false)
return (
  <>
    <button onClick={() => setIsVisible(!isVisible)}>トグル</button>
    {isVisible && <div>コンテンツ</div>}
  </>
)
```

**根本原因**: CSSで単純な表示/非表示を処理できる

```tsx
// Good: 根本原因の修正
<details>
  <summary>トグル</summary>
  <div>コンテンツ</div>
</details>

// またはCSS
.toggle:checked ~ .content { display: block; }
```

## 判断フレームワーク

症状への修正を見つけたら、以下を問う:

1. **完全に防げないか？**（より良い設計）
2. **よりシンプルな技術で解決できないか？**（HTML/CSSファースト）
3. **原因を治療しているか、結果を治療しているか？**（5 Whys）
4. **この修正はスケールするか？**（またはより多くのパッチが必要になるか）
5. **React/フレームワークのやり方か？**（パターンを正しく使用）
