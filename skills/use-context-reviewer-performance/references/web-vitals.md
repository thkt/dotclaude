# Web Vitals

## Core Metrics

| Metric | Target | Measures                   |
| ------ | ------ | -------------------------- |
| LCP    | <2.5s  | Largest content paint time |
| FID    | <100ms | First input delay          |
| CLS    | <0.1   | Cumulative layout shift    |

## LCP Optimization

| Technique      | Implementation                          |
| -------------- | --------------------------------------- |
| Priority load  | `fetchpriority="high"` on hero image    |
| Preload        | `<link rel="preload" as="image">`       |
| No lazy on LCP | Remove `loading="lazy"` from above-fold |
| Code splitting | `lazy()` for non-critical routes        |

## CLS Prevention

| Cause               | Solution                               |
| ------------------- | -------------------------------------- |
| Images without size | Add `width`/`height` or `aspect-ratio` |
| Dynamic content     | Reserve space with `min-height`        |
| Web fonts           | `font-display: swap`                   |
| Ads/embeds          | Fixed containers                       |

## FID Optimization

| Technique          | Impact                    |
| ------------------ | ------------------------- |
| Code splitting     | Reduce initial JS         |
| Long tasks         | Break into <50ms chunks   |
| Web workers        | Offload heavy computation |
| Defer non-critical | `defer`/`async` scripts   |

## Measurement

```typescript
import { getCLS, getFID, getLCP } from "web-vitals";

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

## Checklist

| Check            | Target                         |
| ---------------- | ------------------------------ |
| Lighthouse score | ≥90                            |
| LCP element      | Priority loaded                |
| Images           | Sized, WebP, lazy (below fold) |
| Dynamic content  | Space reserved                 |
