# Control Flow & Complexity

## Nesting Rules

| Technique     | Before (Bad)                                | After (Good)                          |
| ------------- | ------------------------------------------- | ------------------------------------- |
| Guard clauses | `if (a) { if (b) { if (c) { ... } } }`      | `if (!a) return; if (!b) return; ...` |
| Early returns | Nested if-else with result at deepest level | Sequential if-returns                 |
| Extract logic | `if (a && b && !c && d === 'X') { }`        | `if (canAccessContent(user)) { }`     |

## Miller's Law Limits

| Target               | Ideal | Max | Action if exceeded        |
| -------------------- | ----- | --- | ------------------------- |
| Function parameters  | 3     | 5   | Use parameter object      |
| Nesting depth        | 2     | 3   | Use guard clauses         |
| Conditional branches | 3     | 5   | Use data structure/map    |
| Function lines       | 5-15  | 20  | Extract smaller functions |

## Code Examples

### Guard Clauses

```typescript
// Bad (4 levels)
function process(order) {
  if (order) {
    if (order.isValid) {
      if (order.user) {
        if (order.user.hasPermission) {
          /*...*/
        }
      }
    }
  }
}

// Good (1 level)
function process(order) {
  if (!order) return;
  if (!order.isValid) return;
  if (!order.user?.hasPermission) return;
  // Process order
}
```

### Data Structure Over Conditionals

```typescript
// Bad (7 branches)
function getStatus(code) {
  if (code === "A") return "Active";
  if (code === "P") return "Pending";
  // ... 5 more
}

// Good (lookup)
const STATUS_MAP = { A: "Active", P: "Pending" /*...*/ };
const getStatus = (code) => STATUS_MAP[code] || "Unknown";
```

## Checklist

| Check              | Pass Criteria               |
| ------------------ | --------------------------- |
| Parameters         | ≤ 5 per function            |
| Nesting            | ≤ 3 levels deep             |
| Branches           | ≤ 5 per function            |
| Length             | ≤ 15 lines                  |
| Complex conditions | Extracted to named function |
| Control flow       | Obvious, no clever tricks   |
