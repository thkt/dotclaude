# Principles Application Guide

> Start with Quick Reference for immediate needs. Read Detailed Guide for deeper understanding.

---

## 🚀 Quick Reference

### Priority Matrix

| Priority | Principle | One-liner | When to Apply |
|----------|-----------|-----------|---------------|
| 🔴 **Essential** | | | |
| | Occam's Razor | Choose the simplest solution that works | Always - every decision |
| | Progressive Enhancement | Build simple, enhance gradually | Starting any implementation |
| 🟡 **Default** | | | |
| | Readable Code | Code for humans, not computers | Writing any code |
| | TDD/Baby Steps | Small incremental changes with tests | Development process |
| | DRY | Don't Repeat Yourself | 3+ duplications found |
| 🟢 **Contextual** | | | |
| | SOLID | Design for change | Large-scale architecture |
| | Container/Presentational | Separate logic from UI | React/UI components |
| | Law of Demeter | Only talk to immediate friends | Complex dependencies |
| | Leaky Abstraction | Accept imperfect abstractions | Evaluating abstractions |
| | AI-Assisted Development | AI generates, humans validate | When using AI tools |
| | TIDYINGS | Clean as you go | During development |

### Decision Flow

```markdown
New Task?
├─→ Apply Occam's Razor (simplest approach?)
├─→ Use Progressive Enhancement (can build incrementally?)
├─→ Ensure Readable Code (will others understand?)
└─→ Apply other principles as needed
```

### Conflict Resolution

| Conflict | Resolution | Example |
|----------|------------|---------|
| **DRY vs Readable** | Readable wins | Accept duplication if abstraction hurts clarity |
| **SOLID vs Simple** | Simple wins | Don't over-engineer for imagined futures |
| **Perfect vs Working** | Working wins | Ship leaky abstractions that solve real problems |
| **Abstraction vs Concrete** | Start concrete | Abstract only when pattern emerges (3+ times) |

### Red Flags 🚩

- Method chains > 3 levels → Apply Law of Demeter
- Can't understand in 1 minute → Apply Readable Code
- Implementing "just in case" → Remember YAGNI
- Perfect abstraction attempt → Accept Leaky Abstraction
- Complex solution first → Apply Occam's Razor
- Accepting AI output without review → Apply AI-Assisted Development

### Quick Commands

| Situation | Command | Principles Applied |
|-----------|---------|-------------------|
| Bug fix | `/fix` | Occam's Razor, Progressive Enhancement |
| New feature | `/research → /think → /code` | TDD, Baby Steps, SOLID |
| Refactoring | `/research → /code` | TIDYINGS, DRY, Readable Code |
| Emergency | `/hotfix` | Occam's Razor only |

---

## 📚 Detailed Guide

### Understanding the Principle Hierarchy

Our principles form a hierarchy based on frequency of application and impact:

#### Level 1: Universal Principles (Always Active)

**Occam's Razor** serves as the meta-principle. Every decision, from architecture to variable naming, should pass through this filter: "Is this the simplest solution that solves the problem?"

**Progressive Enhancement** defines our approach. Never build the complete solution upfront. Start with the minimum viable implementation and enhance based on real needs, not speculation.

#### Level 2: Process Principles (Default Workflow)

**Readable Code** is non-negotiable for team collaboration. If a new team member can't understand your code in under a minute, it needs simplification.

**TDD/Baby Steps** structures our development rhythm. Red → Green → Refactor → Commit. Each cycle should be completable in minutes, not hours.

**DRY** prevents maintenance nightmares but applies only after patterns emerge. The rule of three: first time, write it; second time, note the duplication; third time, abstract it.

#### Level 3: Contextual Principles (Specific Situations)

These principles activate based on context:

- **SOLID** when designing systems that will evolve
- **Container/Presentational** when building UI components
- **Law of Demeter** when coupling becomes problematic
- **Leaky Abstraction** when evaluating framework choices
- **TIDYINGS** when code quality degrades

### Principle Dependency Graph

Understanding how principles relate to and build upon each other helps you apply them coherently:

```mermaid
graph TD
    %% Meta-principle at the top
    OR[OCCAM'S RAZOR<br/>Meta-Principle<br/>'Simplest solution wins']

    %% Level 1: Universal Principles
    OR -->|influences| PE[PROGRESSIVE<br/>ENHANCEMENT<br/>'Build simple<br/>→ enhance']
    OR -->|influences| RC[READABLE CODE<br/>'Code for humans']
    OR -->|influences| DRY[DRY<br/>"Don't repeat<br/>yourself"]

    %% Supporting principle for Readable Code
    RC -->|supported by| ML[MILLER'S LAW<br/>'7±2 cognitive<br/>limit']

    %% Level 2: Applied Practices (from Progressive Enhancement)
    PE -->|informs| TDD[TDD/Baby Steps<br/>'Red-Green-<br/>Refactor']

    %% Level 2: Applied Practices (from Readable Code & DRY)
    RC -->|informs| CP[CONTAINER/<br/>PRESENTATIONAL<br/>'Separate logic<br/>from UI']
    DRY -->|informs| TIDY[TIDYINGS<br/>'Clean as<br/>you go']

    %% SOLID as separate hierarchy
    SOLID[SOLID<br/>Principles<br/>'Design for<br/>change']
    OR -->|balances| SOLID
    SOLID -->|informs| CP
    SOLID -->|informs| LOD[LAW OF<br/>DEMETER<br/>'Talk to<br/>immediate<br/>friends']

    %% Leaky Abstraction
    OR -->|accepts| LA[LEAKY<br/>ABSTRACTION<br/>'Pragmatic over<br/>perfect']

    %% Styling for different principle types
    classDef metaPrinciple fill:#ff6b6b,stroke:#c92a2a,stroke-width:3px,color:#fff
    classDef universalPrinciple fill:#4dabf7,stroke:#1971c2,stroke-width:2px,color:#fff
    classDef appliedPractice fill:#51cf66,stroke:#2f9e44,stroke-width:2px,color:#fff
    classDef contextual fill:#ffd43b,stroke:#fab005,stroke-width:2px,color:#000
    classDef scientific fill:#e599f7,stroke:#ae3ec9,stroke-width:2px,color:#fff

    class OR metaPrinciple
    class PE,RC,DRY universalPrinciple
    class TDD,CP,TIDY,LOD,LA appliedPractice
    class SOLID contextual
    class ML scientific
```

**Graph Legend:**

- 🔴 **Red (Meta-Principle)**: OCCAM'S RAZOR - Questions all complexity
- 🔵 **Blue (Universal)**: Applied to every decision by default
- 🟢 **Green (Applied Practice)**: Concrete implementation patterns
- 🟡 **Yellow (Contextual)**: Applied when situation demands
- 🟣 **Purple (Scientific)**: Cognitive science backing

**Key Relationships:**

1. **Occam's Razor → Everything**: Meta-principle that questions all complexity
2. **Occam's Razor → Progressive Enhancement**: Start simple, add complexity only when needed
3. **Occam's Razor → DRY**: Balance abstraction (DRY) with simplicity (Occam's Razor)
4. **Occam's Razor ⟷ SOLID**: Balancing relationship - SOLID for structure, Occam's Razor prevents over-engineering
5. **Progressive Enhancement → TDD/Baby Steps**: Both emphasize incremental development
6. **Readable Code → Miller's Law**: Cognitive science backing for readability limits (7±2 items)
7. **SOLID → Container/Presentational**: SRP (Single Responsibility Principle) drives UI/logic separation
8. **SOLID → Law of Demeter**: Both manage dependencies and coupling
9. **Readable Code + DRY → TIDYINGS**: Practical application of keeping code clean
10. **Occam's Razor → Leaky Abstraction**: Accept imperfect abstraction for simplicity

**How to Use This Graph:**

- **Starting point**: Begin with Occam's Razor (red) for every decision
- **Building up**: Apply universal principles (blue) - Progressive Enhancement, Readable Code, DRY
- **Implementation**: Use applied practices (green) - TDD, Container/Presentational, TIDYINGS
- **Specific contexts**: Apply contextual principles (yellow) - SOLID, Law of Demeter only when needed
- **Conflict resolution**: When principles conflict, trace back to Occam's Razor at the top

### Practical Application Scenarios

#### Scenario 1: Starting a New Feature

```markdown
1. Begin with Progressive Enhancement mindset
   - What's the simplest version that provides value?
   - Can we ship this incrementally?

2. Apply TDD/Baby Steps
   - Write the simplest failing test
   - Implement minimum code to pass
   - Refactor only if clarity improves

3. Check Readable Code
   - Would a new developer understand this?
   - Are names self-documenting?

4. Consider SOLID only if:
   - Multiple teams will extend this
   - Requirements explicitly mention future changes
   - You're building a public API
```

#### Scenario 2: Fixing Legacy Code

```markdown
1. Occam's Razor first
   - What's the minimal change that fixes the issue?
   - Can we avoid restructuring?

2. Apply TIDYINGS
   - Clean only what you touch
   - Leave the codebase better, not perfect

3. Consider DRY carefully
   - Is the duplication actually harmful?
   - Will abstraction make debugging harder?

4. Accept Leaky Abstractions
   - Don't fix framework limitations
   - Work with them, document them
```

#### Scenario 3: Code Review Checklist

```typescript
// For each principle, ask:

// ✓ Occam's Razor
Is there a simpler way to achieve this?

// ✓ Progressive Enhancement
Could this be shipped in smaller pieces?

// ✓ Readable Code
Can I understand this without context?

// ✓ DRY
Is this duplication actually problematic?

// ✓ Law of Demeter
obj.method()           // ✓ Good
obj.prop.method()      // ⚠️ Question
obj.prop.prop.method() // ✗ Refactor

// ✓ Leaky Abstraction
Are we fighting the framework or working with it?
```

### Principle Deep Dives

#### When Principles Compete

**DRY vs Readable Code**

```typescript
// ❌ DRY taken too far
const processData = (data, mode) => {
  return mode === 'user'
    ? data.filter(x => x.active).map(x => ({...x, type: 'user'}))
    : data.filter(x => x.enabled).map(x => ({...x, type: 'admin'}))
}

// ✅ Readable duplication
const processUsers = (users) => {
  return users
    .filter(user => user.active)
    .map(user => ({...user, type: 'user'}))
}

const processAdmins = (admins) => {
  return admins
    .filter(admin => admin.enabled)
    .map(admin => ({...admin, type: 'admin'}))
}
```

**SOLID vs Occam's Razor**

```typescript
// ❌ SOLID over-engineering for simple need
interface DataProcessor { process(data: Data): Result }
class UserProcessor implements DataProcessor { }
class ProcessorFactory { }
class ProcessorRegistry { }

// ✅ Simple solution for current need
function processUser(user) {
  return { ...user, processed: true }
}
// Add abstraction only when 2nd processor appears
```

#### Progressive Enhancement in Practice

```typescript
// Phase 1: Make it work (Occam's Razor)
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Phase 2: Real error encountered (not imagined)
function calculateTotal(items) {
  if (!items) return 0
  return items.reduce((sum, item) => sum + item.price, 0)
}

// Phase 3: Real performance issue measured
const calculateTotal = memo((items) => {
  if (!items) return 0
  return items.reduce((sum, item) => sum + item.price, 0)
})

// Note: Each phase only after real need proven
```

### Integration with Commands

| Command | Primary Principles | Secondary Principles |
|---------|-------------------|---------------------|
| `/think` | SOLID, Occam's Razor | Progressive Enhancement |
| `/research` | - | All principles for context |
| `/code` | TDD, Baby Steps | Readable Code, DRY, AI-Assisted Development |
| `/test` | TDD | Law of Demeter, AI-Assisted Development |
| `/fix` | Occam's Razor | TIDYINGS |
| `/hotfix` | Occam's Razor only | - |
| `/audit` | All principles | Priority order |

### Anti-Patterns to Avoid

#### The Perfect Abstraction Trap

```typescript
// ❌ Trying to create the perfect abstraction
class AbstractDataProcessorFactoryBuilder<T> { }

// ✅ Accept the leak, provide escape hatch
class DataProcessor {
  process(data) { }

  // Escape hatch for when abstraction leaks
  processRaw(sql) { }
}
```

#### The DRY Zealot

```typescript
// ❌ Extracting everything
const TRUE = true
const FALSE = false
const ZERO = 0

// ✅ Pragmatic approach
// Some duplication is fine
// Constants for domain concepts, not programming literals
```

#### The SOLID Evangelist

```typescript
// ❌ Interfaces for everything
interface IUserService { }
interface IUserRepository { }
interface IUserValidator { }
// Only one implementation each

// ✅ Start concrete, abstract when needed
class UserService {
  // Add interface when 2nd implementation appears
}
```

### Measuring Success

You're applying principles correctly when:

- **Code reviews are fast** - Reviewers understand quickly
- **Changes are localized** - Modifications don't cascade
- **Debugging is straightforward** - Problems are where expected
- **New features are easy** - Codebase doesn't fight you
- **Tests are simple** - No complex mocking required

You're over-applying principles when:

- **Simple tasks are complex** - Over-abstraction
- **Everything has an interface** - SOLID overdose
- **No duplication anywhere** - DRY extremism
- **Perfect abstractions attempted** - Ignoring leaks
- **Refactoring never ends** - TIDYINGS obsession

### Evolution Path

As you grow:

1. **Beginner**: Focus on Occam's Razor and Readable Code
2. **Intermediate**: Add Progressive Enhancement and TDD
3. **Advanced**: Apply SOLID and Law of Demeter contextually
4. **Expert**: Know when to break principles

Remember: **Principles are tools, not rules**. The goal is working, maintainable software that solves real problems, not perfect adherence to principles.

## Final Wisdom

> "The best principle is knowing when not to apply a principle."

When in doubt:

1. Choose simple over clever
2. Choose concrete over abstract
3. Choose working over perfect
4. Choose clear over DRY
5. Choose pragmatic over pure

## References

### Core Documents

- [@./reference/OCCAMS_RAZOR.md](./reference/OCCAMS_RAZOR.md) - The meta-principle
- [@./development/PROGRESSIVE_ENHANCEMENT.md](./development/PROGRESSIVE_ENHANCEMENT.md) - The approach
- [@./development/READABLE_CODE.md](./development/READABLE_CODE.md) - The baseline

### All Principles

- Reference: [@./reference/](./reference/) - SOLID, DRY, Occam's Razor
- Development: [@./development/](./development/) - All practical principles
- Commands: [@../docs/COMMANDS.md](../docs/COMMANDS.md) - Integrated workflows
