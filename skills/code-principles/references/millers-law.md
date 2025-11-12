# Miller's Law - The Cognitive Limit Principle

## Core Philosophy

**"The Magical Number Seven, Plus or Minus Two"** - George A. Miller (1956)

The human mind can hold approximately **7±2 items** in short-term memory. This cognitive limit has profound implications for software design.

## Scientific Foundation

### The Research

In 1956, cognitive psychologist George Miller discovered that humans can reliably distinguish about seven different categories and hold about seven items in short-term memory. This isn't just about numbers - it applies to:

- Distinct options
- Menu items
- Function parameters
- Interface elements
- Conceptual chunks

### Why It Matters in Software

When we exceed this cognitive limit:

- **Comprehension time increases exponentially** (not linearly)
- **Error rates multiply** - 5 items: baseline, 9 items: 2x errors, 12 items: 4x errors
- **Mental fatigue** accelerates
- **Decision paralysis** occurs

## Practical Application in Code

### Function Parameters

```typescript
// ❌ Cognitive overload - 9 parameters
function createUser(
  firstName, lastName, email,
  phone, address, city,
  state, zip, country
) { }

// ✅ Respecting cognitive limits - 3 grouped parameters
function createUser(
  identity: UserIdentity,    // name, email
  contact: ContactInfo,      // phone, address
  location: LocationInfo     // city, state, country
) { }
```

### Class Interfaces

```typescript
// ❌ Too many methods to remember
class DataProcessor {
  validate() { }
  sanitize() { }
  normalize() { }
  transform() { }
  aggregate() { }
  filter() { }
  sort() { }
  paginate() { }
  cache() { }
  serialize() { }
  compress() { }
  encrypt() { }
}

// ✅ Grouped into cognitive chunks
class DataProcessor {
  // Input processing (3 methods)
  prepare() { }     // validate + sanitize + normalize

  // Data manipulation (3 methods)
  transform() { }
  filter() { }
  aggregate() { }

  // Output processing (2 methods)
  format() { }      // serialize + compress
  secure() { }      // encrypt
}
```

### UI Design

```typescript
// ❌ Too many options
<Select>
  {/* 15 options - cognitive overload */}
</Select>

// ✅ Hierarchical grouping
<Select>
  <OptionGroup label="Common">
    {/* 5 most used options */}
  </OptionGroup>
  <OptionGroup label="Advanced">
    {/* 5 advanced options */}
  </OptionGroup>
</Select>
```

## Application Guidelines

### Recommended Limits

| Context | Ideal | Maximum | Critical |
|---------|-------|---------|----------|
| Function arguments | 3 | 5 | 7 |
| Class methods | 5 | 7 | 9 |
| Interface properties | 5 | 7 | 9 |
| Menu items | 5 | 7 | 9 |
| Enum values | 5 | 9 | 12 |
| Conditional branches | 3 | 5 | 7 |

### Chunking Strategies

When you must exceed 7±2 items, use **chunking**:

```typescript
// Phone number chunking
"5551234567"    // ❌ Hard to remember
"555-123-4567"  // ✅ Three chunks

// Code organization
// ❌ Flat list of 12 imports
import { a, b, c, d, e, f, g, h, i, j, k, l } from 'library'

// ✅ Grouped imports (3-4 per group)
import {
  // UI Components
  Button, Input, Select,
  // Layout Components
  Grid, Flex, Stack,
  // Utility Components
  Modal, Toast, Tooltip
} from 'library'
```

### Measurement Techniques

How to verify you're within cognitive limits:

1. **The Glance Test**: Can you remember all items after a 3-second look?
2. **The New Developer Test**: Can a newcomer understand without notes?
3. **The Recall Test**: Can you list all options from memory?

## Connection to Other Principles

### Supports Readable Code

Miller's Law provides the **scientific basis** for why readable code matters:

```typescript
// Readable Code says "minimize understanding time"
// Miller's Law explains "because cognitive capacity is limited to 7±2"
```

### Reinforces Occam's Razor

```typescript
// Occam's Razor says "choose the simplest solution"
// Miller's Law quantifies "simple = within cognitive limits"
```

### Validates KISS

```typescript
// KISS says "Keep It Simple, Stupid"
// Miller's Law defines "simple = ≤7 concepts"
```

## Warning Signs

You're violating Miller's Law when:

- Developers constantly refer to documentation for function signatures
- Code reviews frequently ask "what does parameter 6 do?"
- New team members take weeks to remember the API
- You need extensive comments to explain parameter purposes
- IDE autocomplete becomes essential (not just helpful)

## Practical Refactoring

### Before: Cognitive Overload

```typescript
function processOrder(
  customerId, productId, quantity, price,
  discount, tax, shipping, expedited,
  giftWrap, giftMessage, couponCode,
  paymentMethod, billingAddress, shippingAddress
) { }
```

### After: Cognitive Chunks

```typescript
function processOrder(
  orderItem: OrderItem,       // product, quantity, price
  customer: Customer,         // id, addresses
  pricing: PricingDetails,    // discount, tax, shipping
  options?: OrderOptions      // gift, expedited, coupon
) { }
```

## Remember

> "The mind is not a vessel to be filled, but a fire to be kindled." - Plutarch

Respect cognitive limits not because the rule says so, but because it makes code **human-friendly**. Software is written once but read hundreds of times - optimize for the reader's cognitive capacity.

## Practical Checklist

Before committing code, verify:

- [ ] Function parameters ≤ 5?
- [ ] Class public methods ≤ 7?
- [ ] Conditional branches ≤ 5?
- [ ] Can you recall all options from memory?
- [ ] Would a new developer understand without notes?

## Key Takeaway

**7±2 is not just a number - it's the boundary between clarity and confusion.**

## Related Principles

### Scientific Foundation For

- [@../development/READABLE_CODE.md](../development/READABLE_CODE.md) - Provides cognitive science basis
- [@./OCCAMS_RAZOR.md](./OCCAMS_RAZOR.md) - Quantifies what "simple" means
- [@../development/CONTAINER_PRESENTATIONAL.md](../development/CONTAINER_PRESENTATIONAL.md) - Limits component responsibilities

### Complemented By

- [@./SOLID.md](./SOLID.md) - Single Responsibility aligns with cognitive limits
- [@./DRY.md](./DRY.md) - Reduces mental load through elimination of duplication
