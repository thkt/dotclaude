# Vercel React Reference

MEDIUM and LOW priority rule indexes. Check these when user specifically asks for
deep optimization.

## 4. Client-Side Data — MEDIUM-HIGH

| Rule                           | Description                        |
| ------------------------------ | ---------------------------------- |
| client-swr-dedup               | SWR for automatic request dedup    |
| client-event-listeners         | Deduplicate global event listeners |
| client-passive-event-listeners | Passive listeners for scroll       |
| client-localstorage-schema     | Version and minimize localStorage  |

## 5. Re-render — MEDIUM

| Rule                               | Description                                     |
| ---------------------------------- | ----------------------------------------------- |
| rerender-defer-reads               | Don't subscribe to state only used in callbacks |
| rerender-memo                      | Extract expensive work into memoized components |
| rerender-memo-with-default-value   | Hoist default non-primitive props               |
| rerender-dependencies              | Primitive dependencies in effects               |
| rerender-derived-state             | Subscribe to derived booleans, not raw          |
| rerender-derived-state-no-effect   | Derive state during render, not effects         |
| rerender-functional-setstate       | Functional setState for stable callbacks        |
| rerender-lazy-state-init           | Function to useState for expensive init         |
| rerender-simple-expression-in-memo | Avoid memo for simple primitives                |
| rerender-move-effect-to-event      | Interaction logic in event handlers             |
| rerender-transitions               | startTransition for non-urgent updates          |
| rerender-use-ref-transient-values  | Refs for transient frequent values              |

## 6. Rendering — MEDIUM

| Rule                                 | Description                           |
| ------------------------------------ | ------------------------------------- |
| rendering-animate-svg-wrapper        | Animate div wrapper, not SVG element  |
| rendering-content-visibility         | content-visibility for long lists     |
| rendering-hoist-jsx                  | Extract static JSX outside components |
| rendering-svg-precision              | Reduce SVG coordinate precision       |
| rendering-hydration-no-flicker       | Inline script for client-only data    |
| rendering-hydration-suppress-warning | Suppress expected mismatches          |
| rendering-activity                   | Activity component for show/hide      |
| rendering-conditional-render         | Ternary, not && for conditionals      |
| rendering-usetransition-loading      | useTransition for loading state       |

## 7. JS Performance — LOW-MEDIUM

| Rule                      | Description                              |
| ------------------------- | ---------------------------------------- |
| js-batch-dom-css          | Group CSS changes via classes or cssText |
| js-index-maps             | Build Map for repeated lookups           |
| js-cache-property-access  | Cache object properties in loops         |
| js-cache-function-results | Cache function results in module Map     |
| js-cache-storage          | Cache localStorage/sessionStorage reads  |
| js-combine-iterations     | Combine filter/map into one loop         |
| js-length-check-first     | Check length before expensive comparison |
| js-early-exit             | Return early from functions              |
| js-hoist-regexp           | Hoist RegExp outside loops               |
| js-min-max-loop           | Loop for min/max instead of sort         |
| js-set-map-lookups        | Set/Map for O(1) lookups                 |
| js-tosorted-immutable     | toSorted() for immutability              |

## 8. Advanced — LOW

| Rule                        | Description                        |
| --------------------------- | ---------------------------------- |
| advanced-event-handler-refs | Store event handlers in refs       |
| advanced-init-once          | Initialize app once per app load   |
| advanced-use-latest         | useLatest for stable callback refs |
