# Web Vitals Optimization

## 📊 Google's Core Web Vitals

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

## 🚀 Improving LCP (Largest Contentful Paint)

### Priority Loading for LCP Elements

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

### Improving FCP with Code Splitting

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

## 🔍 Profiling Tools

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

---

## 📋 Web Vitals Checklist

### Initial Load Optimization

- [ ] Priority load LCP elements (`fetchpriority="high"`)
- [ ] Lazy load non-critical JS (`lazy()`)
- [ ] Optimize images (WebP, appropriate sizes)
- [ ] Remove unused libraries
- [ ] Measure bundle size (Webpack Bundle Analyzer)

### Layout Shift Prevention

- [ ] Specify width/height for images
- [ ] Reserve space for dynamic content
- [ ] Optimize font loading (`font-display: swap`)

### Measurement & Monitoring

- [ ] Maintain Lighthouse score 90+
- [ ] Measure Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Regular profiling with Chrome DevTools

---

## 💡 Key Takeaways

1. **LCP**: Priority load critical resources, preload hero images
2. **FID**: Reduce JavaScript execution time, code splitting
3. **CLS**: Reserve space for dynamic content, specify image dimensions
4. **Always measure first** - Use Lighthouse and Chrome DevTools
