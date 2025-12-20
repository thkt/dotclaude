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

### Principle Relationships

For detailed principle relationships and dependency graph, see:
[@./PRINCIPLE_RELATIONSHIPS.md](./PRINCIPLE_RELATIONSHIPS.md)

### Practical Application Scenarios

| Scenario | Key Principles | Approach |
|----------|---------------|----------|
| **New Feature** | Progressive Enhancement<br>TDD/Baby Steps<br>Readable Code | 1. Start with simplest version<br>2. Write failing test → minimal code<br>3. Ensure clarity for new developers<br>4. Consider SOLID only if: multi-team, public API, or explicit future requirements |
| **Legacy Fix** | Occam's Razor<br>TIDYINGS<br>Leaky Abstraction | 1. Minimal change to fix issue<br>2. Clean only touched code<br>3. Question DRY: is duplication harmful?<br>4. Accept framework limitations, don't fight them |
| **Code Review** | All principles | Check each: Simpler way? (Occam)<br>Ship incrementally? (Progressive)<br>Understandable? (Readable)<br>Duplication problematic? (DRY)<br>Method chains >2? (Demeter)<br>Fighting framework? (Leaky) |

### Principle Deep Dives

#### When Principles Compete

| Conflict | Resolution | Example |
|----------|------------|---------|
| **DRY vs Readable** | Readable wins | Accept duplication if abstraction hurts clarity |
| **SOLID vs Simple** | Simple wins | Don't over-engineer for imagined futures |
| **Perfect vs Working** | Working wins | Ship leaky abstractions that solve real problems |

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
