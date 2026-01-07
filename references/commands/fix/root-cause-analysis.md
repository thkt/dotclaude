# Root Cause Analysis (Phase 1)

Find the true cause of the bug, not just symptoms.

## Purpose

Apply 5 Whys methodology with Explore agent to identify root cause before fixing.

## Dynamic Context

### Recent Changes

```bash
!`git diff HEAD~1 --stat | head -10`
```

Review recent commits that might have introduced the bug.

### Test Status

```bash
!`npm run || yarn run || pnpm run || echo "No package manager"`
```

Check current test suite status.

### Spec Reference (Optional)

If spec.md exists from `/think`:

- Check `.claude/workspace/planning/**/spec.md`
- Use FR-xxx and test scenarios as reference
- Verify if bug breaks existing requirements

## Phase 1: Root Cause Analysis

Use Explore agent for quick context (30 sec):

```typescript
Task({
  subagent_type: "Explore",
  thoroughness: "quick",
  description: "Bug context exploration",
  prompt: `
    Bug: "${bugDescription}"
    Find: Related files, dependencies, recent commits
    Apply 5 Whys: Identify root cause, not just symptom
    Return: Findings with [✓/→/?] markers
  `,
});
```

### Key Questions (5 Whys)

1. **Why did this happen?**
   - What is the immediate cause?

2. **Why did that condition exist?**
   - What allowed this to occur?

3. **Why wasn't this caught?**
   - What in our process missed this?

4. **Why is this pattern here?**
   - Is this isolated or systematic?

5. **Why do we do it this way?**
   - Is the design inherently flawed?

### Analysis Output

Identify and classify:

- **Symptom**: What the user sees
- **Proximate cause**: What failed directly
- **Root cause**: Why it failed
- **Scope**: Files and components affected

### Pattern Recognition

Determine if this is:

- [Isolated] **Isolated issue**: One-off bug in specific condition
- [Pattern] **Pattern issue**: Same problem in multiple places
- [Critical] **Systematic issue**: Design flaw requiring refactor

### Confidence Markers

Use throughout analysis: [@../../../rules/development/COMPLETION_CRITERIA.md#confidence-metrics](../../../rules/development/COMPLETION_CRITERIA.md#confidence-metrics)

### Example Analysis

```markdown
Root Cause Analysis

**Symptom**:

- [✓] User sees negative total when discount > price

**Proximate Cause**:

- [✓] calculateTotal returns price - discount without check

**Root Cause**:

- [✓] No validation for discount exceeding price
- [→] Requirements didn't specify this edge case
- [?] Other discount calculations may have same issue

**Scope**:

- [✓] File: src/utils/pricing.ts:42
- [→] Similar pattern in: src/checkout/discount.ts
- [?] May affect: src/reports/sales.ts

**Pattern**: [Pattern] Potential pattern - need to check other discount logic
**Confidence**: 0.85
```

## When to Skip Analysis

- **Trivial fixes**: Typos, obvious missing checks
- **High confidence (>0.95)**: Cause is immediately clear
- **Time pressure**: Production hotfix with known cause

In these cases, proceed directly to Phase 1.5 (Regression Test).

## When to Escalate

If root cause analysis reveals:

- **Confidence < 0.7**: Switch to `/research` for deeper investigation
- **Systematic issue**: Switch to `/think` → `/code` for proper design
- **Multiple components**: Complexity exceeds quick fix scope

## Integration Points

- **Next**: Phase 1.5 (Regression Test)
- **Escalate to**: `/research` (low confidence) or `/think` (systematic)
- **References**: Spec.md (if available)

## Output Format

```markdown
Root Cause Analysis Complete

Bug: [Description]
Root Cause: [Identified cause] [Confidence: 0.XX]
Affected: [Files]
Pattern: [Isolated/Pattern/Systematic]

Next: Write regression test
```
