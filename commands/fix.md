---
description: >
  Rapidly fix small bugs and minor improvements in development environment.
  Use for well-understood (≥80%) small-scale fixes. NOT for production emergencies (use /hotfix).
  Applies Occam's Razor (simplest solution) and TIDYINGS (clean as you go).
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: inherit
argument-hint: "[bug or issue description]"
---

# /fix - Quick Bug Fix

## Purpose

Rapidly fix small bugs with root cause analysis and confidence-based verification.

## When to Use

| Use `/fix` | Use other command |
|------------|-------------------|
| Small, well-understood issue | Unknown root cause → `/research` |
| Development environment | Production emergency → `/hotfix` |
| Single file or 2-3 files | Multi-file refactoring → `/code` |
| Confidence ≥80% | New feature → `/think` |

## Dynamic Context

### Recent Changes

```bash
!`git diff HEAD~1 --stat | head -10`
```

### Test Status

```bash
!`npm run || yarn run || pnpm run || echo "No package manager"`
```

### Spec Reference (Optional)

If spec.md exists from `/think`:

- Check `.claude/workspace/planning/**/spec.md`
- Use FR-xxx and test scenarios as reference

## Fix Process

### Phase 1: Root Cause Analysis

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
  `
})
```

**Key Questions**:

- What is the symptom vs root cause?
- Is this pattern or isolated issue?
- What areas are affected?

### Phase 2: Implementation

Based on confidence:

- **High (>0.9)**: Direct fix
- **Medium (0.7-0.9)**: Add defensive checks
- **Low (<0.7)**: Switch to `/research`

**Apply Occam's Razor**:

- Simplest change that fixes the issue
- Don't restructure surrounding code
- CSS-first for UI issues

### Phase 3: Verification

Run quality checks in parallel:

```bash
npm test -- --findRelatedTests
npm run lint -- --fix
npm run type-check
```

## Definition of Done

```text
✅ Root cause identified (not just symptom)
✅ Minimal complexity solution applied
✅ All related tests pass
✅ No new lint errors
✅ No regressions detected
```

**Confidence Target**: Overall ≥0.9

## Output Format

```text
🔧 Fix Summary

Problem: [Description]
Root Cause: [Why it happened]
Confidence: 0.XX

Solution:
- Files: [modified files]
- Approach: [fix strategy]

Verification:
- Tests: ✅ XX/XX passing
- Lint: ✅ No issues
- Types: ✅ Valid

Status: ✅ COMPLETE (Confidence: 0.XX)
```

## Escalation

If confidence drops below 0.7:

```text
⚠️ Low Confidence - Recommend escalation:
- /research - Investigate deeper
- /think - Plan comprehensive solution
- /code - Implement with full TDD
```

## Applied Principles

- **Occam's Razor**: Simplest solution that works
- **TIDYINGS**: Clean only what you touch
- **Progressive Enhancement**: CSS-first for UI issues

## Next Steps

After fix:

- **Success**: Document learnings, add regression test
- **Partial**: Follow-up `/fix` or `/research`
- **Escalation**: `/think` → `/code` for comprehensive solution
