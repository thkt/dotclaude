# Bundle Size Optimization

## 📦 Code Splitting

### Lazy Loading Components

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

### Route-based Code Splitting

```tsx
// ❌ All routes in initial bundle
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
import { lazy, Suspense } from 'react';

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

## 🌳 Tree Shaking

### Import Only What You Need

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

### Library-specific Patterns

```typescript
// ❌ Entire Material-UI
import { Button, TextField, Select } from '@mui/material';

// ✅ Individual imports
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';

// ❌ All of date-fns
import { format, parse, addDays } from 'date-fns';

// ✅ Individual functions
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import addDays from 'date-fns/addDays';
```

---

## 📊 Measuring Bundle Size

### Webpack Bundle Analyzer

```bash
# Install
npm install --save-dev webpack-bundle-analyzer

# Add to webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin()
  ]
};

# Or add to package.json
"scripts": {
  "analyze": "webpack-bundle-analyzer build/stats.json"
}
```

### Vite Bundle Analyzer

```bash
# Install
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({ open: true })
  ]
}
```

### Reading Bundle Analysis

```markdown
Key metrics to check:
1. **Largest dependencies** - Can they be replaced with lighter alternatives?
2. **Duplicate dependencies** - Are there multiple versions of the same library?
3. **Unused code** - Are there imports that are never used?
4. **Total bundle size** - Is it within acceptable range (<200KB for critical path)?
```

---

## 🖼️ Image Optimization

### Choosing Appropriate Format

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
<Image
  src="/photo.jpg"
  alt="Photo"
  width={800}
  height={600}
  loading="lazy"  // Lazy loading
/>
<!-- Auto-optimization + WebP conversion -->
```

### Responsive Images

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

## 📋 Bundle Optimization Checklist

### Code Splitting

- [ ] Route-based splitting for SPA
- [ ] Component lazy loading for heavy components
- [ ] Dynamic imports for conditional features
- [ ] Vendor bundle separation

### Tree Shaking

- [ ] Import specific functions, not entire libraries
- [ ] Use ES modules (`import/export`) over CommonJS
- [ ] Remove unused dependencies
- [ ] Check for duplicate dependencies

### Image Optimization

- [ ] Use WebP format with fallback
- [ ] Implement responsive images (`srcset`)
- [ ] Lazy load images below the fold
- [ ] Compress images before deployment

### Monitoring

- [ ] Regular bundle size analysis
- [ ] Set budget alerts (warn when bundle > threshold)
- [ ] Track bundle size in CI/CD
- [ ] Monitor over time (prevent bundle bloat)

---

## 🎯 Bundle Size Targets

### General Guidelines

```markdown
**Initial Load (Critical Path)**
- Target: < 200KB (gzipped)
- Maximum: < 350KB (gzipped)

**Total Bundle**
- Small app: < 500KB (gzipped)
- Medium app: < 1MB (gzipped)
- Large app: < 2MB (gzipped)

**Individual Routes (Lazy loaded)**
- Target: < 100KB (gzipped) per route
- Maximum: < 200KB (gzipped) per route
```

### Budget Configuration

```json
// package.json
{
  "budget": {
    "main.js": "200kb",
    "vendor.js": "300kb",
    "*.chunk.js": "100kb"
  }
}
```

---

## 🔧 Advanced Techniques

### Dynamic Imports for Features

```tsx
// ✅ Load feature only when needed
async function enableAnalytics() {
  const analytics = await import('./analytics');
  analytics.init();
}

// Only load when user accepts cookies
if (userAcceptedCookies) {
  enableAnalytics();
}
```

### Prefetching Resources

```tsx
// ✅ Prefetch likely next route
<Link
  to="/dashboard"
  onMouseEnter={() => {
    import('./Dashboard');  // Prefetch on hover
  }}
>
  Dashboard
</Link>
```

---

## 💡 Key Takeaways

1. **Code Splitting**: Split by route and heavy components
2. **Tree Shaking**: Import only what you need
3. **Image Optimization**: Use modern formats and responsive images
4. **Measure Regularly**: Use bundle analyzer to track size
5. **Set Budgets**: Prevent bundle bloat with size limits

---

## ⚠️ Common Mistakes

### Splitting Too Much

```tsx
// ❌ Over-splitting small components
const Button = lazy(() => import('./Button'));  // Button is tiny!

// ✅ Only split heavy components
const ChartDashboard = lazy(() => import('./ChartDashboard'));
```

### Ignoring Vendor Bundle

```tsx
// ❌ All vendors in one huge bundle
// vendor.js: 2MB (includes everything)

// ✅ Split vendors by usage
// common.js: React, ReactDOM (used everywhere)
// charts.js: Chart.js (only for analytics)
// editor.js: Monaco Editor (only for code editor)
```

### Not Measuring

```tsx
// ❌ Optimizing blindly
"I'll use lazy loading everywhere just in case"

// ✅ Measure first, optimize second
"Bundle analyzer shows ChartComponent is 500KB → lazy load it"
```

---

**Remember**: "Premature optimization is the root of all evil" - Measure first, then optimize based on data.
