# Bundle Optimization

## Size Targets

| Category          | Target | Max   |
| ----------------- | ------ | ----- |
| Initial (gzipped) | <200KB | 350KB |
| Per route chunk   | <100KB | 200KB |
| Total app         | <1MB   | 2MB   |

## Code Splitting

| Pattern         | Use Case                           |
| --------------- | ---------------------------------- |
| Route-based     | `lazy(() => import('./Page'))`     |
| Component-based | Heavy components (charts, editors) |
| Feature-based   | Dynamic import on user action      |

```tsx
const Dashboard = lazy(() => import('./Dashboard'))

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

## Tree Shaking

| Bad                                      | Good                                        |
| ---------------------------------------- | ------------------------------------------- |
| `import _ from 'lodash'`                 | `import debounce from 'lodash/debounce'`    |
| `import { Button } from '@mui/material'` | `import Button from '@mui/material/Button'` |
| `import * as utils from './utils'`       | `import { specific } from './utils'`        |

## Image Optimization

| Format | Use Case                 |
| ------ | ------------------------ |
| WebP   | Photos, complex images   |
| SVG    | Icons, simple graphics   |
| AVIF   | Next-gen (with fallback) |

```html
<picture>
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="" />
</picture>
```

## Analysis Tools

| Tool    | Command                    |
| ------- | -------------------------- |
| Webpack | `webpack-bundle-analyzer`  |
| Vite    | `rollup-plugin-visualizer` |
| Next.js | `@next/bundle-analyzer`    |

## Checklist

| Check            | Action                 |
| ---------------- | ---------------------- |
| Route splitting  | All routes lazy loaded |
| Heavy components | Lazy loaded            |
| Imports          | Specific, not barrel   |
| Images           | WebP, responsive, lazy |
| Unused deps      | Removed                |
| Bundle analysis  | Regular checks         |
