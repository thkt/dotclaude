# Reactパフォーマンス最適化

## 不要な再レンダリングの防止

### React.memo - コンポーネントのメモ化

```tsx
// Bad: 親が再レンダリングするたびに再レンダリング
function ExpensiveComponent({ data }: { data: Data }) {
  // 重い計算
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
}

// Good: propsが変わらない限り再レンダリングしない
const ExpensiveComponent = React.memo(({ data }: { data: Data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
});

// Good: カスタム比較関数（深い比較が必要な場合）
const ExpensiveComponent = React.memo(
  ({ data }: { data: Data }) => {
    const result = expensiveCalculation(data);
    return <div>{result}</div>;
  },
  (prevProps, nextProps) => {
    // trueを返すと再レンダリングをスキップ
    return prevProps.data.id === nextProps.data.id;
  }
);
```

### useMemo - 計算のメモ化

```tsx
// Bad: 毎回計算が実行される
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = products.sort((a, b) => b.price - a.price);
  // 親が再レンダリングするたびにソートが実行

  return <ul>{sortedProducts.map(...)}</ul>;
}

// Good: productsが変わらない限り計算しない
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => b.price - a.price),
    [products]  // 依存配列
  );

  return <ul>{sortedProducts.map(...)}</ul>;
}

// ⚠️ 使いすぎない: 軽い計算には不要
// Bad: 過剰な最適化
const doubled = useMemo(() => count * 2, [count]);  // 不要

// Good: 直接計算
const doubled = count * 2;
```

### useCallback - 関数のメモ化

```tsx
// Bad: 毎回新しい関数が作成される
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked');
  };

  // React.memoでもChildが再レンダリング（毎回新しい関数）
  return <Child onClick={handleClick} />;
}

// Good: 関数を再利用
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);  // 空の依存配列 = 一度だけ作成

  return <Child onClick={handleClick} />;
}

// Good: ステートを使用する場合
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]);  // countが変わったら再作成

  return <Child onClick={handleClick} />;
}
```

---

## 📜 リストレンダリングの最適化

### 仮想化

```tsx
// Bad: 非効率: すべてのアイテムをレンダリング
function LargeList({ items }: { items: Item[] }) {
  return (
    <div style={{ height: '500px', overflow: 'auto' }}>
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}
// 10,000アイテム = 重い初期レンダリング

// Good: 仮想化: 表示中のアイテムのみレンダリング
import { FixedSizeList } from 'react-window';

function LargeList({ items }: { items: Item[] }) {
  return (
    <FixedSizeList
      height={500}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <ItemComponent item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
// 10,000アイテムでも高速
```

---

## ステート管理の最適化

### ステートの分離

```tsx
// Bad: グローバルステートがアプリ全体を再レンダリング
function App() {
  const [user, setUser] = useState({ name: '', cart: [] });

  return (
    <>
      <Header user={user} />  {/* nameのみ使用 */}
      <Cart items={user.cart} />  {/* cartのみ使用 */}
    </>
  );
}
// user.cartが変わる → Headerも再レンダリング

// Good: ステートを分離
function App() {
  const [userName, setUserName] = useState('');
  const [cart, setCart] = useState([]);

  return (
    <>
      <Header userName={userName} />  {/* cart変更で再レンダリングしない */}
      <Cart items={cart} />
    </>
  );
}
```

---

## React DevTools Profiler

### コンポーネントパフォーマンスのプロファイリング

```tsx
// プロファイリング対象をラップ
import { Profiler } from 'react';

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Component />
    </Profiler>
  );
}

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  console.log(`${id}のレンダリングに${actualDuration}msかかりました`);
}

// React DevToolsで確認
// 1. DevTools → Profilerタブ
// 2. 🔴 Recordボタンをクリック
// 3. 操作を実行
// 4. Flame graphで再レンダリングを確認
```

---

## React最適化チェックリスト

### レンダリング最適化

- [ ] 高コストコンポーネントに`React.memo`
- [ ] 計算量の多い操作に`useMemo`
- [ ] 子に渡す関数に`useCallback`
- [ ] 長いリストに仮想化（react-window）
- [ ] ステートの適切な分離

### プロファイリング & デバッグ

- [ ] React DevToolsで定期的にプロファイリング
- [ ] 不要な再レンダリングをチェック
- [ ] コンポーネントのレンダリング時間を測定
- [ ] 高コスト操作を特定

---

## キーポイント

1. **React.memo**: 不要なコンポーネント再レンダリングを防止
2. **useMemo**: 高コストな計算をキャッシュ
3. **useCallback**: 関数の再作成を防止
4. **仮想化**: 長いリストでは表示中のアイテムのみレンダリング
5. **ステート分離**: 連鎖的な再レンダリングを防止
6. **まず測定**: 最適化前にReact DevTools Profilerを使用

---

## よくある落とし穴

### 過剰な最適化

```tsx
// Bad: 不要なメモ化
const doubled = useMemo(() => count * 2, [count]);  // オーバーヘッド > 利益

// Good: 直接計算
const doubled = count * 2;
```

### 依存関係の欠落

```tsx
// Bad: 古いクロージャ
const handleClick = useCallback(() => {
  console.log(count);  // 常に0をログ出力
}, []);  // count依存関係が欠落

// Good: 正しい依存関係
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);
```

### すべてをメモ化

```tsx
// Bad: 過剰エンジニアリング
const MyComponent = React.memo(() => {
  const value1 = useMemo(() => prop1 + 1, [prop1]);
  const value2 = useMemo(() => prop2 * 2, [prop2]);
  const value3 = useMemo(() => prop3 - 1, [prop3]);
  // ... メモ化しすぎ

  return <div>{value1} {value2} {value3}</div>;
});

// Good: 高コスト操作のみメモ化
const MyComponent = React.memo(() => {
  const expensiveValue = useMemo(
    () => performHeavyCalculation(data),
    [data]
  );  // これだけメモ化が必要

  return <div>{expensiveValue}</div>;
});
```

---

## 判断フレームワーク

**React.memoを使うべき場合？**

- 同じpropsで頻繁にレンダリングされる
- レンダリングが高コスト（複雑なUIや計算）
- 親が頻繁に再レンダリングされる

**useMemoを使うべき場合？**

- 計算が計算コストが高い
- 結果がレンダリングや依存関係で使用される
- プロファイリングでパフォーマンス問題が見つかった

**useCallbackを使うべき場合？**

- メモ化された子にpropとして関数を渡す
- useEffect/useMemoの依存関係として関数を使用
- 不要な再レンダリングを防ぐことが重要

**覚えておく**: 時期尚早な最適化は諸悪の根源。まず測定、次に最適化。
