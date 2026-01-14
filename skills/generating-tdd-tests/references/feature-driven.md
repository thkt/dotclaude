# Feature-Driven TDD Example

How `/code` command uses TDD for new feature development.

## Context

- **Source**: spec.md with functional requirements
- **Approach**: Generate all tests in skip state, activate one-by-one

## Workflow

```text
1. Read spec.md
   └─ Extract FR-xxx requirements
   └─ Identify Given-When-Then scenarios

2. Generate skipped tests
   └─ Create test scaffold (all skipped)
   └─ ALL tests in skip state (it.skip())
   └─ Ordered simple → complex

3. Interactive activation
   └─ Display next test
   └─ User confirms: [Y]es / [S]kip / [Q]uit
   └─ Activate → Red → Green → Refactor → Commit
   └─ Repeat for each test

4. All tests active and passing
```

## Example

```typescript
// Generated from spec.md (all skipped):

it.skip("handles zero input", () => {
  // TODO: [SKIP] FR-001
  expect(calculateDiscount(0)).toBe(0.1);
});

it.skip("calculates basic case", () => {
  // TODO: [SKIP] FR-002
  expect(calculateDiscount(100)).toBe(10);
});

// User activates first test:
// Step 1: Remove .skip
// Step 2: Red - test fails (function doesn't exist)
// Step 3: Green - minimal implementation
// Step 4: Refactor - clean up
// Step 5: Commit - save progress

// Repeat for next test...
```

## Key Characteristics

- **Proactive**: Tests before implementation
- **Spec-driven**: Requirements → tests → code
- **User-controlled**: Explicit activation
- **Baby Steps**: One test at a time

## Detailed Walkthrough

### Phase 0: Test Generation

**From spec.md** (FR-001, FR-002, FR-003), generate:

```typescript
describe("Discount Calculator", () => {
  it.skip("handles zero purchase (FR-001)", () => {
    expect(calculateDiscount(0)).toBe(0.1);
  });

  it.skip("calculates standard discount (FR-002)", () => {
    expect(calculateDiscount(50)).toBe(5);
  });

  it.skip("applies bulk discount (FR-003)", () => {
    expect(calculateDiscount(200)).toBe(30);
  });
});
```

All tests in skip state, ordered simple → complex (Baby Steps).

### Interactive Activation Cycle

**Cycle 1: Activate First Test**

````text
🔄 RGRC Cycle 1/3

Activate the next test?

📝 Test: "handles zero purchase (FR-001)"
📁 File: src/discount.test.ts:4
📋 From: FR-001 (Zero purchase handling)

```typescript
it('handles zero purchase (FR-001)', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})
````

[Y] Activate and enter Red phase
[S] Skip to next test
[Q] Quit

````text
**User chooses: Y**

**🔴 Red Phase**:

```typescript
// Remove .skip marker
it('handles zero purchase (FR-001)', () => {
  expect(calculateDiscount(0)).toBe(0.1)
})

// Run test
$ npm test

FAIL  src/discount.test.ts
  ✕ handles zero purchase (FR-001)
    ReferenceError: calculateDiscount is not defined

→ Test fails for RIGHT reason: function doesn't exist yet
````

**🟢 Green Phase - Minimal Implementation**:

```typescript
// src/discount.ts
export function calculateDiscount(amount: number): number {
  return 0.1  // Simplest solution that passes
}

// Run test
$ npm test

PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)

→ Test passes! Move to Refactor
```

**🔵 Refactor Phase**:

```typescript
// Code is already clean for this simple case
// No refactoring needed yet

// Run tests to confirm green
$ npm test

PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)
```

**✅ Commit**:

```bash
$ git add src/discount.ts src/discount.test.ts
$ git commit -m "feat: handle zero purchase (FR-001)

- Add calculateDiscount function with minimum discount
- Test passes for zero input case"
```

**Subsequent Cycles**

Cycles 2 and 3 follow the same pattern:

```text
🔄 RGRC Cycle 2/3
📝 Test: "calculates standard discount (FR-002)"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit

🔄 RGRC Cycle 3/3
📝 Test: "applies bulk discount (FR-003)"
[Y] → 🔴 Red → 🟢 Green → 🔵 Refactor → ✅ Commit
```

Each cycle:

1. Activate test (remove .skip)
2. Verify failure (Red)
3. Minimal implementation (Green)
4. Refactor if needed (Refactor)
5. Commit progress (Commit)

**Final state**:

```typescript
// Final implementation
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1
  const rate = amount > 100 ? 0.15 : 0.1
  return amount * rate
}

// All tests passing
PASS  src/discount.test.ts
  ✓ handles zero purchase (FR-001)
  ✓ calculates standard discount (FR-002)
  ✓ applies bulk discount (FR-003)
```

## Common Pitfalls

### Bad: Activating Multiple Tests at Once

```typescript
// Don't do this:
it("test 1", () => {}); // Activated
it("test 2", () => {}); // Activated <- Multiple at once!
it.skip("test 3", () => {});
```

**Why bad**: Violates Baby Steps. If tests fail, you don't know which change caused it.

**Fix**: Activate one test at a time.

### Bad: Writing Implementation Before Test

```typescript
// Don't do this:
// 1. Write full calculateDiscount function
// 2. Then activate tests

// Do this:
// 1. Activate ONE test (Red)
// 2. Write MINIMAL code (Green)
// 3. Refactor
// 4. Next test
```

### Bad: Skipping Refactor Phase

```typescript
// After Green phase:
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1;
  if (amount > 0 && amount <= 100) return amount * 0.1;
  if (amount > 100) return amount * 0.15;
  return 0; // Dead code!
}

// Should refactor to:
export function calculateDiscount(amount: number): number {
  if (amount === 0) return 0.1;
  const rate = amount > 100 ? 0.15 : 0.1;
  return amount * rate;
}
```

## Decision Points

### When to Skip a Test?

- Test is too complex for current understanding
- Dependencies not ready yet
- Requires architectural decision

**Note**: Come back later, don't delete.

### When to Commit?

- ✅ All tests green
- ✅ Code refactored and clean
- ✅ Confidence = 1.0

**Frequency**: Every test activation cycle (typically 5-10 minutes).

## Benefits

- **Spec-driven**: Requirements directly drive tests
- **No surprises**: User controls pace
- **Always green**: Frequent commits with passing tests
- **Clear progress**: Visual test queue shows remaining work
