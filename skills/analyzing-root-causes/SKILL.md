---
name: analyzing-root-causes
description: >
  Root cause analysis with 5 Whys methodology for software problems.
  Triggers: 根本原因, root cause, 5 Whys, なぜなぜ分析, 対症療法, patch,
  symptom, 症状, 表面的, workaround, ワークアラウンド, 本質的,
  応急処置, bandaid, quick fix.
allowed-tools: Read, Grep, Glob, Task
---

# Root Cause Analysis - 5 Whys Methodology

Target: Solve problems once and properly by addressing root causes, not symptoms.

## Symptom vs Root Cause

| Type | Example | Result |
| --- | --- | --- |
| Symptom Fix | Add setTimeout to wait for DOM | Works now, breaks later |
| Root Cause Fix | Use React ref properly | Permanent solution |
| Symptom Fix | Add flag to prevent double-submit | Complexity grows |
| Root Cause Fix | Disable button during submission | Simple, reliable |

## Section-Based Loading

| Section | File | Focus | Triggers |
| --- | --- | --- | --- |
| 5 Whys | `references/five-whys.md` | Analysis process, templates | 5 Whys, なぜなぜ |
| Patterns | `references/symptom-patterns.md` | Common symptom→cause patterns | 対症療法, workaround |

## Quick Checklist

Before implementing a fix, ask:

- [ ] Is this fixing the symptom or the cause?
- [ ] What would prevent this problem entirely?
- [ ] Can simpler technology (HTML/CSS) solve this?
- [ ] Is JavaScript truly necessary here?
- [ ] Will this fix introduce new complexity?

## 5 Whys Process

1. **Why** does this problem occur? → [Observable fact]
2. **Why** does that happen? → [Implementation detail]
3. **Why** is that the case? → [Design decision]
4. **Why** does that exist? → [Architectural constraint]
5. **Why** was it designed this way? → [Root cause]

### Example Analysis

**Problem**: Button click triggers action twice

1. **Why** twice? → Click handler fires twice
2. **Why** twice handler? → React re-renders during click
3. **Why** re-render? → State update in click handler causes re-render
4. **Why** state in click? → Using state for something that shouldn't be state
5. **Why** using state? → **Root cause: Treating imperative action as reactive state**

**Solution**: Use ref instead of state for imperative flag, or disable button properly

## Key Principles

| Principle | Application |
| --- | --- |
| Prevention > Patching | Best fix prevents the problem entirely |
| Simple > Complex | Root cause solutions are usually simpler |
| Ask Why | Don't accept the first answer |
| Progressive Enhancement | Can CSS/HTML solve this? |

## Common Symptom Patterns

### Timing Issues

```typescript
// Bad: Symptom: setTimeout to wait for DOM
useEffect(() => {
  setTimeout(() => { document.getElementById('target')?.scrollIntoView() }, 100)
}, [])

// Good: Root cause: Use React ref
const targetRef = useRef<HTMLDivElement>(null)
useEffect(() => { targetRef.current?.scrollIntoView() }, [])
```

### State Synchronization

```typescript
// Bad: Symptom: Multiple effects to sync state
useEffect(() => { setFilteredItems(items.filter(i => i.active)) }, [items])
useEffect(() => { setCount(filteredItems.length) }, [filteredItems])

// Good: Root cause: Derive state, don't sync
const filteredItems = useMemo(() => items.filter(i => i.active), [items])
const count = filteredItems.length
```

### Polling for Child State

```typescript
// Bad: Symptom: Parent polling child for state
const childRef = useRef()
useEffect(() => {
  const interval = setInterval(() => { childRef.current?.getValue() }, 1000)
}, [])

// Good: Root cause: Proper data flow (lifting state or callbacks)
const [value, setValue] = useState()
return <Child onValueChange={setValue} />
```

## References

### Core Principles

- [@~/.claude/rules/development/PROGRESSIVE_ENHANCEMENT.md](../../rules/development/PROGRESSIVE_ENHANCEMENT.md) - Simple first
- [@~/.claude/skills/applying-code-principles/SKILL.md](../../skills/applying-code-principles/SKILL.md) - Simplest solution

### Related Skills

- `enhancing-progressively` - CSS-first approach often addresses root causes
- `applying-code-principles` - Design principles prevent root cause issues

### Used by Agents

- `root-cause-reviewer` - Primary consumer of this skill
