---
name: performance-optimization
description: >
  Frontend performance optimization expertise.
  Triggers on keywords: "パフォーマンス (performance)", "遅い (slow)", "最適化 (optimization)", "レンダリング (rendering)",
  "バンドルサイズ (bundle size)", "LCP", "FID", "CLS", "Web Vitals", "再レンダリング (re-render)", "メモ化 (memoization)", etc.
  Suggests practical techniques for React optimization, Web Vitals improvement, and bundle optimization.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Task
  - mcp__chrome-devtools__*
  - mcp__mdn__*
---

# Performance Optimization - Data-Driven Frontend Optimization

## 🎯 Core Philosophy

**"Premature optimization is the root of all evil"** - Donald Knuth

Optimize **after measuring**. Make decisions based on data, not feelings.

### What This Skill Provides

1. **Web Vitals-Based Measurement** - LCP, FID, CLS improvement techniques
2. **React Optimization Patterns** - Reducing re-renders, proper memoization usage
3. **Bundle Optimization** - Code splitting, Tree shaking, lazy loading
4. **Measurement Tools** - Chrome DevTools, Lighthouse, React DevTools

---

## 📊 Web Vitals - Google's Core Metrics

### Three Core Metrics

1. **LCP (Largest Contentful Paint)** - Loading speed
   - Target: Within 2.5 seconds
   - Time until largest content appears

2. **FID (First Input Delay)** - Interactivity
   - Target: Within 100ms
   - Response time to first user interaction

3. **CLS (Cumulative Layout Shift)** - Visual stability
   - Target: Below 0.1
   - Total amount of layout shifts

### Measurement

```typescript
// Using web-vitals library
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);  // Measure CLS
getFID(console.log);  // Measure FID
getLCP(console.log);  // Measure LCP

// Or Chrome DevTools
// 1. DevTools → Lighthouse tab
// 2. Click "Generate report"
// 3. Check Web Vitals in Performance section
```

---

## ⚡ React Performance Optimization

### 1. Preventing Unnecessary Re-renders

#### React.memo - Component Memoization

```tsx
// ❌ Re-renders every time parent re-renders
function ExpensiveComponent({ data }: { data: Data }) {
  // Heavy calculation
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
}

// ✅ No re-render unless props change
const ExpensiveComponent = React.memo(({ data }: { data: Data }) => {
  const result = expensiveCalculation(data);
  return <div>{result}</div>;
});

// ✅ Custom comparison function (when deep comparison needed)
const ExpensiveComponent = React.memo(
  ({ data }: { data: Data }) => {
    const result = expensiveCalculation(data);
    return <div>{result}</div>;
  },
  (prevProps, nextProps) => {
    // Return true to skip re-render
    return prevProps.data.id === nextProps.data.id;
  }
);
```

#### useMemo - Computation Memoization

```tsx
// ❌ Calculation runs every time
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = products.sort((a, b) => b.price - a.price);
  // Sorting runs every time parent re-renders

  return <ul>{sortedProducts.map(...)}</ul>;
}

// ✅ No calculation unless products change
function ProductList({ products }: { products: Product[] }) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => b.price - a.price),
    [products]  // Dependency array
  );

  return <ul>{sortedProducts.map(...)}</ul>;
}

// ⚠️ Don't overuse: Unnecessary for light calculations
// ❌ Over-optimization
const doubled = useMemo(() => count * 2, [count]);  // Unnecessary

// ✅ Direct calculation
const doubled = count * 2;
```

#### useCallback - Function Memoization

```tsx
// ❌ New function created every time
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log('Clicked');
  };

  // Child re-renders even with React.memo (new function every time)
  return <Child onClick={handleClick} />;
}

// ✅ Reuse function
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);  // Empty dependency array = created once

  return <Child onClick={handleClick} />;
}

// ✅ With state
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    console.log('Count:', count);
  }, [count]);  // Recreate when count changes

  return <Child onClick={handleClick} />;
}
```

### 2. List Rendering Optimization

```tsx
// ❌ Inefficient: Rendering all items
function LargeList({ items }: { items: Item[] }) {
  return (
    <div style={{ height: '500px', overflow: 'auto' }}>
      {items.map(item => <ItemComponent key={item.id} item={item} />)}
    </div>
  );
}
// 10,000 items = heavy initial render

// ✅ Virtualization: Render only visible items
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
// Fast even with 10,000 items
```

### 3. State Management Optimization

```tsx
// ❌ Global state causes entire app to re-render
function App() {
  const [user, setUser] = useState({ name: '', cart: [] });

  return (
    <>
      <Header user={user} />  {/* Only uses name */}
      <Cart items={user.cart} />  {/* Only uses cart */}
    </>
  );
}
// user.cart changes → Header also re-renders

// ✅ Separate state
function App() {
  const [userName, setUserName] = useState('');
  const [cart, setCart] = useState([]);

  return (
    <>
      <Header userName={userName} />  {/* No re-render on cart change */}
      <Cart items={cart} />
    </>
  );
}
```

---

## 📦 Bundle Size Optimization

### 1. Code Splitting

```tsx
// ❌ Include everything in main.js
import HeavyComponent from './HeavyComponent';

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>Show</button>
      {show && <HeavyComponent />}
    </>
  );
}
// main.js includes HeavyComponent (even when not used)

// ✅ Lazy loading
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  const [show, setShow] = useState(false);

  return (
    <>
      <button onClick={() => setShow(true)}>Show</button>
      {show && (
        <Suspense fallback={<div>Loading...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </>
  );
}
// HeavyComponent loaded when needed
```

### 2. Tree Shaking

```typescript
// ❌ Import everything
import _ from 'lodash';  // Entire library included (hundreds of KB)

const result = _.debounce(fn, 300);

// ✅ Import only needed function
import debounce from 'lodash/debounce';  // Only debounce

const result = debounce(fn, 300);

// Or
import { debounce } from 'lodash-es';  // ES module version
```

### 3. Measuring Bundle Size

```bash
# Webpack Bundle Analyzer
npm install --save-dev webpack-bundle-analyzer

# Add to package.json
"scripts": {
  "analyze": "webpack-bundle-analyzer build/stats.json"
}

# For Vite
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

## 🖼️ Image Optimization

### 1. Choosing Appropriate Format

```html
<!-- ❌ Inefficient: Large PNG -->
<img src="photo.png" alt="Photo" />
<!-- 5MB PNG -->

<!-- ✅ Using WebP + fallback -->
<picture>
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" />
</picture>
<!-- 500KB WebP -->

<!-- ✅ Next.js Image component -->
import Image from 'next/image';

<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  loading="lazy"  // Lazy loading
/>
<!-- Auto-optimization + WebP conversion -->
```

### 2. Responsive Images

```html
<!-- ❌ Fixed size: Large image even on mobile -->
<img src="large-image.jpg" alt="Photo" />

<!-- ✅ Multiple sizes with srcset -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, 800px"
  alt="Photo"
/>
<!-- Browser selects appropriate size -->
```

---

## 🚀 Loading Performance

### 1. Improving LCP (Largest Contentful Paint)

```tsx
// ❌ Lazy loading LCP element
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="lazy"  // NO lazy for LCP element
      alt="Hero"
    />
  );
}

// ✅ Priority loading for LCP element
function Hero() {
  return (
    <img
      src="hero.jpg"
      loading="eager"  // Or omit
      fetchpriority="high"  // Increase priority
      alt="Hero"
    />
  );
}

// ✅ Preload (even faster)
// Add to HTML <head>
<link rel="preload" as="image" href="hero.jpg" />
```

### 2. Improving FCP with Code Splitting

```tsx
// ❌ All modules in initial load
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

// ✅ Split by route
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

## 📏 Improving CLS (Cumulative Layout Shift)

### Layout Shift Causes and Solutions

```tsx
// ❌ Image without size → Layout shift
function Article() {
  return (
    <>
      <h1>Title</h1>
      <img src="article.jpg" alt="Article" />
      {/* Text shifts down when image loads */}
      <p>Content...</p>
    </>
  );
}

// ✅ Specify image size
function Article() {
  return (
    <>
      <h1>Title</h1>
      <img
        src="article.jpg"
        alt="Article"
        width={800}
        height={600}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {/* Space reserved, no shift */}
      <p>Content...</p>
    </>
  );
}

// ✅ Maintain aspect ratio
function Article() {
  return (
    <>
      <h1>Title</h1>
      <div style={{ aspectRatio: '16 / 9' }}>
        <img
          src="article.jpg"
          alt="Article"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <p>Content...</p>
    </>
  );
}

// ❌ Dynamic content insertion → Layout shift
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);  // Fetch banner
  }, []);

  return (
    <>
      {banner && <div className="banner">{banner}</div>}
      {/* Content shifts down when banner appears */}
      <nav>...</nav>
    </>
  );
}

// ✅ Reserve space
function Header() {
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    fetchBanner().then(setBanner);
  }, []);

  return (
    <>
      <div className="banner" style={{ minHeight: banner ? 'auto' : '100px' }}>
        {banner || <div>Loading...</div>}
      </div>
      {/* Height reserved, no shift */}
      <nav>...</nav>
    </>
  );
}
```

---

## 🔍 Performance Profiling

### Chrome DevTools Performance Tab

```markdown
1. **Start Recording**
   - DevTools → Performance tab
   - Click 🔴 Record button
   - Perform actions
   - Click Stop button

2. **Analysis Points**
   - **FPS**: Maintaining 60fps?
   - **Main thread**: Long tasks (>50ms)?
   - **Network**: Resource loading time
   - **Rendering**: Layout/paint frequency

3. **Identify Bottlenecks**
   - Check time breakdown in Summary tab
   - Scripting (JavaScript execution)
   - Rendering (Layout/Paint)
   - Painting (Drawing)
```

### React DevTools Profiler

```tsx
// Wrap profiling target
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
  console.log(`${id} took ${actualDuration}ms to render`);
}

// Check in React DevTools
// 1. DevTools → Profiler tab
// 2. Click 🔴 Record button
// 3. Perform actions
// 4. Check re-renders in Flame graph
```

---

## 📋 Performance Checklist

### Initial Load Optimization

- [ ] Priority load LCP elements (`fetchpriority="high"`)
- [ ] Lazy load non-critical JS (`lazy()`)
- [ ] Optimize images (WebP, appropriate sizes)
- [ ] Remove unused libraries
- [ ] Measure bundle size (Webpack Bundle Analyzer)

### Rendering Optimization

- [ ] `React.memo` for expensive components
- [ ] `useMemo` for computation-heavy operations
- [ ] `useCallback` for functions passed to children
- [ ] Virtualization for long lists (react-window)
- [ ] Properly separate state

### Layout Shift Prevention

- [ ] Specify width/height for images
- [ ] Reserve space for dynamic content
- [ ] Optimize font loading (`font-display: swap`)

### Measurement & Monitoring

- [ ] Maintain Lighthouse score 90+
- [ ] Measure Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Regular profiling with Chrome DevTools
- [ ] Check unnecessary re-renders with React DevTools

---

## 💡 Practical Application

### Auto-Trigger Example

```markdown
User: "Page is loading slowly"

Performance Optimization Skill triggers →

"From a performance perspective, let's start by measuring:

1. Check Web Vitals with Lighthouse
2. Identify heavy resources in Network tab
3. Analyze bottlenecks in Performance tab

Common causes:
- Unoptimized images
- Loading unnecessary JavaScript
- Excessive re-renders

I'll show you specific measurement methods..."
```

### Common Scenarios

1. **Excessive re-renders**
   - Identify with React DevTools Profiler
   - Suggest `React.memo`, `useMemo`, `useCallback`

2. **Slow initial load**
   - Identify bottlenecks with Lighthouse
   - Suggest Code Splitting, image optimization

3. **Large bundle size**
   - Analyze with Bundle Analyzer
   - Suggest Tree Shaking, remove unused libraries

4. **Layout shifts occurring**
   - Measure CLS
   - Suggest specifying image sizes, reserving space

---

## 🎯 Optimization Priorities

### 1. Measure First

```markdown
❌ Optimize by feeling:
"Feels kind of slow"
→ Add useMemo everywhere

✅ Decide by data:
1. Run Lighthouse → LCP: 5.2s
2. Network tab → hero.png is 3MB
3. Optimize image → LCP: 1.8s ✓
```

### 2. High Impact First

```markdown
Priority:
1. **Initial load time** (LCP)
   - Directly affects first impression

2. **Interactivity** (FID)
   - Directly affects user experience

3. **Layout stability** (CLS)
   - Prevents misclicks

4. **Other optimizations**
   - Only when measurable problems exist
```

### 3. Understand Trade-offs

```tsx
// Memoization cost vs benefit
// ❌ Memoize light calculation (overhead > benefit)
const doubled = useMemo(() => count * 2, [count]);

// ✅ Memoize heavy calculation (benefit > overhead)
const filtered = useMemo(
  () => items.filter(item => complexFilter(item)),
  [items]
);
```

---

## ✨ Key Takeaways

1. **Measure First** - Always measure before optimizing
2. **User-Centric Metrics** - Use Web Vitals as baseline
3. **Progressive Enhancement** - Fast basics, enhance as needed
4. **Avoid Premature Optimization** - Optimize only problematic areas

---

**Remember**: "Make it work, make it right, make it fast - in that order"
