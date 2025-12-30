---
description: >
  データドリブンアプローチによるフロントエンドパフォーマンス最適化の専門知識。
  トリガーキーワード: "パフォーマンス", "performance", "遅い", "slow", "最適化", "optimization",
  "レンダリング", "rendering", "バンドルサイズ", "bundle size", "LCP", "FID", "CLS", "Web Vitals",
  "Core Web Vitals", "再レンダリング", "re-render", "メモ化", "memoization", "useMemo", "useCallback",
  "React.memo", "重い", "heavy", "高速化", "speed up", "lazy loading", "Code splitting", "tree shaking"。
  測定とプロファイリングに基づいたReact最適化、Web Vitals改善、バンドル最適化の実践的技法を提供。
  Web Vitals (LCP, FID, CLS)、Reactレンダリング最適化、バンドルサイズ削減戦略のセクションを含む。
allowed-tools: Read, Grep, Glob, Task, mcp__claude-in-chrome__*, mcp__mdn__*
---

# Performance Optimization - データドリブンなフロントエンド最適化

## 🎯 コア哲学

**「時期尚早な最適化は諸悪の根源である」** - Donald Knuth

**測定してから**最適化する。感覚ではなく、データに基づいて判断する。

### このスキルが提供するもの

1. **Web Vitals ベースの測定** - LCP、FID、CLS 改善技術
2. **React 最適化パターン** - 再レンダリング削減、適切なメモ化使用
3. **バンドル最適化** - コード分割、Tree shaking、遅延読み込み
4. **測定ツール** - Chrome DevTools、Lighthouse、React DevTools

---

## 📊 Web Vitals - Google のコアメトリクス

### 3つのコアメトリクス

1. **LCP (Largest Contentful Paint)** - 読み込み速度
   - 目標: 2.5秒以内
   - 最大コンテンツが表示されるまでの時間

2. **FID (First Input Delay)** - インタラクティブ性
   - 目標: 100ms以内
   - 最初のユーザーインタラクションへの応答時間

3. **CLS (Cumulative Layout Shift)** - 視覚的安定性
   - 目標: 0.1未満
   - レイアウトシフトの累積量

### 測定

```typescript
// web-vitals ライブラリを使用
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);  // CLS を測定
getFID(console.log);  // FID を測定
getLCP(console.log);  // LCP を測定

// または Chrome DevTools
// 1. DevTools → Lighthouse タブ
// 2. "Generate report" をクリック
// 3. Performance セクションで Web Vitals を確認
```

---

## ⚡ React パフォーマンス最適化

### 1. 不要な再レンダリングの防止

#### React.memo - コンポーネントのメモ化

```tsx
// Bad: 親が再レンダリングするたびに再レンダリング
function ExpensiveComponent({ data }: { data: Data }) {
  // 重い計算
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
}

// Good: props が変更されない限り再レンダリングなし
const ExpensiveComponent = React.memo(({ data }: { data: Data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
});

// Good: カスタム比較関数(深い比較が必要な場合)
const ExpensiveComponent = React.memo(
  ({ data }: { data: Data }) => {
    const result = expensiveCalculation(data);
    return <div>{result}</div>;
  },
  (prevProps, nextProps) => {
    // true を返すと再レンダリングをスキップ
    return prevProps.data.id === nextProps.data.id;
  }
);
```

#### useMemo - 計算のメモ化

```tsx
// Bad: 毎回計算が実行される
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = products.sort((a, b) => b.price - a.price);
  // 親が再レンダリングするたびにソートが実行される

  return <ul>{sortedProducts.map(...)}</ul>;
}

// Good: products が変更されない限り計算なし
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => b.price - a.price),
    [products]  // 依存配列
  );

  return <ul>{sortedProducts.map(...)}</ul>;
}

// ⚠️ 過度な使用は避ける: 軽い計算には不要
// Bad: 過剰最適化
const doubled = useMemo(() => count * 2, [count]);  // 不要

// Good: 直接計算
const doubled = count * 2;
```

#### useCallback - 関数のメモ化

```tsx
// Bad: 毎回新しい関数が作成される
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked');
  };

  // React.memo を使っても子は再レンダリングされる(毎回新しい関数)
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

// Good: 状態を使用する場合
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]);  // count が変更されたら再作成

  return <Child onClick={handleClick} />;
}
```

### 2. リストレンダリングの最適化

```tsx
// Bad: 非効率: すべてのアイテムをレンダリング
function LargeList({ items }: { items: Item[] }) {
  return (
    <div style={{ height: '500px', overflow: 'auto' }}>
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}
// 10,000アイテム = 初期レンダリングが重い

// Good: 仮想化: 表示されているアイテムのみレンダリング
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

### 3. 状態管理の最適化

```tsx
// Bad: グローバル状態がアプリ全体の再レンダリングを引き起こす
function App() {
  const [user, setUser] = useState({ name: '', cart: [] });

  return (
    <>
      <Header user={user} />  {/* name のみ使用 */}
      <Cart items={user.cart} />  {/* cart のみ使用 */}
    </>
  );
}
// user.cart が変更 → Header も再レンダリング

// Good: 状態を分離
function App() {
  const [userName, setUserName] = useState('');
  const [cart, setCart] = useState([]);

  return (
    <>
      <Header userName={userName} />  {/* cart 変更時に再レンダリングなし */}
      <Cart items={cart} />
    </>
  );
}
```

---

## 📦 バンドルサイズの最適化

### 1. コード分割

```tsx
// Bad: すべてを main.js に含める
import HeavyComponent from './HeavyComponent';

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>表示</button>
      {show && <HeavyComponent />}
    </>
  );
}
// main.js に HeavyComponent が含まれる(未使用時も)

// Good: 遅延読み込み
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>表示</button>
      {show && (
        <Suspense fallback={<div>読み込み中...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </>
  );
}
// HeavyComponent は必要になったときに読み込まれる
```

### 2. Tree Shaking

```typescript
// Bad: すべてをインポート
import _ from 'lodash';  // ライブラリ全体が含まれる(数百KB)

const result = _.debounce(fn, 300);

// Good: 必要な関数のみインポート
import debounce from 'lodash/debounce';  // debounce のみ

const result = debounce(fn, 300);

// または
import { debounce } from 'lodash-es';  // ES モジュール版
```

### 3. バンドルサイズの測定

```bash
# Webpack Bundle Analyzer
npm install --save-dev webpack-bundle-analyzer

# package.json に追加
"scripts": {
  "analyze": "webpack-bundle-analyzer build/stats.json"
}

# Vite の場合
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({ open: true })
  ]
}
```

---

## 🖼️ 画像の最適化

### 1. 適切なフォーマットの選択

```html
<!-- ❌ 非効率: 大きなPNG -->
<img src="photo.png" alt="写真" />
<!-- 5MB の PNG -->

<!-- ✅ WebP + フォールバック -->
<picture>
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="写真" />
</picture>
<!-- 500KB の WebP -->

<!-- ✅ Next.js の Image コンポーネント -->
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="写真"
  width={800}
  height={600}
  loading="lazy"  // 遅延読み込み
/>
<!-- 自動最適化 + WebP 変換 -->
```

### 2. レスポンシブ画像

```html
<!-- ❌ 固定サイズ: モバイルでも大きな画像 -->
<img src="large-image.jpg" alt="写真" />

<!-- ✅ srcset で複数サイズ -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="写真"
/>
<!-- ブラウザが適切なサイズを選択 -->
```

---

## 🚀 ローディングパフォーマンス

### 1. LCP (Largest Contentful Paint) の改善

```tsx
// Bad: LCP 要素を遅延読み込み
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="lazy"  // LCP 要素では NG
      alt="ヒーロー"
    />
  );
}

// Good: LCP 要素を優先読み込み
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="eager"  // または省略
      fetchpriority="high"  // 優先度を上げる
      alt="ヒーロー"
    />
  );
}

// Good: プリロード(さらに速い)
// HTML の <head> に追加
<link rel="preload" as="image" href="hero.jpg" />
```

### 2. コード分割でFCPを改善

```tsx
// Bad: 初期読み込みにすべてのモジュール
import Dashboard from './Dashboard';
import Settings from './Settings';
import Profile from './Profile';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

// Good: ルートごとに分割
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Profile = lazy(() => import('./Profile'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

---

## 📏 CLS (Cumulative Layout Shift) の改善

### レイアウトシフトの原因と対策

```tsx
// Bad: サイズ指定なしの画像 → レイアウトシフト
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <img src="article.jpg" alt="記事" />
      {/* 画像読み込み時にテキストが下にずれる */}
      <p>コンテンツ...</p>
    </>
  );
}

// Good: 画像サイズを指定
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <img
        src="article.jpg"
        alt="記事"
        width={800}
        height={600}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {/* スペースが確保され、シフトなし */}
      <p>コンテンツ...</p>
    </>
  );
}

// Good: アスペクト比を維持
function Article() {
  return (
    <>
      <h1>タイトル</h1>
      <div style={{ aspectRatio: '16 / 9' }}>
        <img
          src="article.jpg"
          alt="記事"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <p>コンテンツ...</p>
    </>
  );
}

// Bad: 動的コンテンツの挿入 → レイアウトシフト
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);  // バナー取得
  }, []);

  return (
    <>
      {banner && <div className="banner">{banner}</div>}
      {/* バナー表示時にコンテンツが下にずれる */}
      <nav>...</nav>
    </>
  );
}

// Good: スペースを確保
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);
  }, []);

  return (
    <>
      <div className="banner" style={{ minHeight: banner ? 'auto' : '100px' }}>
        {banner || <div>読み込み中...</div>}
      </div>
      {/* 高さが確保され、シフトなし */}
      <nav>...</nav>
    </>
  );
}
```

---

## 🔍 パフォーマンスプロファイリング

### Chrome DevTools Performance タブ

```markdown
1. **記録開始**
   - DevTools → Performance タブ
   - 🔴 Record ボタンをクリック
   - 操作を実行
   - Stop ボタンをクリック

2. **分析ポイント**
   - **FPS**: 60fpsを維持しているか?
   - **Main スレッド**: 長いタスク(>50ms)はないか?
   - **Network**: リソースの読み込み時間
   - **Rendering**: レイアウト/ペイントの頻度

3. **ボトルネックの特定**
   - Summary タブで時間の内訳を確認
   - Scripting(JavaScript実行)
   - Rendering(レイアウト/ペイント)
   - Painting(描画)
```

### React DevTools Profiler

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
  console.log(`${id} のレンダリングに ${actualDuration}ms かかりました`);
}

// React DevTools で確認
// 1. DevTools → Profiler タブ
// 2. 🔴 Record ボタンをクリック
// 3. 操作を実行
// 4. Flame graph で再レンダリングを確認
```

---

## 📋 パフォーマンスチェックリスト

### 初期読み込み最適化

- [ ] LCP 要素を優先読み込み (`fetchpriority="high"`)
- [ ] 非クリティカルな JS を遅延読み込み (`lazy()`)
- [ ] 画像を最適化(WebP、適切なサイズ)
- [ ] 未使用のライブラリを削除
- [ ] バンドルサイズを測定(Webpack Bundle Analyzer)

### レンダリング最適化

- [ ] 高コストなコンポーネントに `React.memo`
- [ ] 計算重い操作に `useMemo`
- [ ] 子に渡す関数に `useCallback`
- [ ] 長いリストに仮想化(react-window)
- [ ] 状態を適切に分離

### レイアウトシフト防止

- [ ] 画像に width/height を指定
- [ ] 動的コンテンツ用にスペース確保
- [ ] フォント読み込みを最適化(`font-display: swap`)

### 測定とモニタリング

- [ ] Lighthouse スコア 90+ を維持
- [ ] Web Vitals を測定(LCP < 2.5s、FID < 100ms、CLS < 0.1)
- [ ] Chrome DevTools で定期的にプロファイリング
- [ ] React DevTools で不要な再レンダリングを確認

---

## 💡 実践的応用

### 自動トリガー例

```markdown
ユーザー: "ページの読み込みが遅い"

Performance Optimization スキルがトリガー →

「パフォーマンスの観点から、まず測定から始めましょう:

1. Lighthouse で Web Vitals を確認
2. Network タブで重いリソースを特定
3. Performance タブでボトルネックを分析

よくある原因:
- 最適化されていない画像
- 不要なJavaScriptの読み込み
- 過剰な再レンダリング

具体的な測定方法を示します...」
```

### 一般的なシナリオ

1. **再レンダリングが多い**
   - React DevTools Profiler で特定
   - `React.memo`、`useMemo`、`useCallback` を提案

2. **初期読み込みが遅い**
   - Lighthouse でボトルネックを特定
   - コード分割、画像最適化を提案

3. **バンドルサイズが大きい**
   - Bundle Analyzer で分析
   - Tree Shaking、未使用ライブラリの削除を提案

4. **レイアウトシフトが発生**
   - CLS を測定
   - 画像サイズ指定、スペース確保を提案

---

## 🎯 最適化の優先順位

### 1. まず測定

```markdown
❌ 感覚で最適化:
「なんとなく遅い気がする」
→ とりあえず useMemo をあちこちに追加

✅ データで判断:
1. Lighthouse を実行 → LCP: 5.2秒
2. Network タブ → hero.png が 3MB
3. 画像を最適化 → LCP: 1.8秒 ✓
```

### 2. 影響の大きいものから

```markdown
優先順位:
1. **初期読み込み時間**(LCP)
   - 第一印象に直結

2. **インタラクティブ性**(FID)
   - ユーザー体験に直結

3. **レイアウト安定性**(CLS)
   - 誤クリックを防ぐ

4. **その他の最適化**
   - 測定可能な問題が存在する場合のみ
```

### 3. トレードオフを理解

```tsx
// メモ化のコスト vs 効果
// Bad: 軽い計算をメモ化(オーバーヘッド > 効果)
const doubled = useMemo(() => count * 2, [count]);

// Good: 重い計算をメモ化(効果 > オーバーヘッド)
const filtered = useMemo(
  () => items.filter(item => complexFilter(item)),
  [items]
);
```

---

## ✨ 重要なポイント

1. **まず測定** - 最適化前に必ず測定
2. **ユーザー中心メトリクス** - Web Vitals を基準に
3. **プログレッシブエンハンスメント** - 基本を高速に、必要に応じて拡張
4. **時期尚早な最適化を避ける** - 問題がある箇所のみ最適化

---

**覚えておいてください**: 「動くようにして、正しくして、速くする - この順番で」
