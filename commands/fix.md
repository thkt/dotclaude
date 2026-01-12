---
description: Rapidly fix small bugs and minor improvements in development environment
allowed-tools: Bash(git diff:*), Bash(git ls-files:*), Bash(npm test:*), Bash(npm run), Bash(npm run:*), Bash(yarn run:*), Bash(pnpm run:*), Bash(bun run:*), Bash(ls:*), Edit, MultiEdit, Read, Grep, Glob, Task
model: inherit
argument-hint: "[bug or issue description]"
dependencies:
  [Explore, test-generator, generating-tdd-tests, orchestrating-workflows]
---

# /fix - Quick Bug Fix

Rapidly fix small bugs with root cause analysis and TDD verification.

## Workflow Reference

**Full workflow**: [@../skills/orchestrating-workflows/references/fix-workflow.md](../skills/orchestrating-workflows/references/fix-workflow.md)

## When to Use

| Use `/fix`                   | Use other command           |
| ---------------------------- | --------------------------- |
| Small, well-understood issue | Unknown cause → `/research` |
| Single file or 2-3 files     | Multi-file → `/code`        |
| Confidence ≥80%              | New feature → `/think`      |

## Fix Process

```text
Phase 1: Root Cause Analysis (5 Whys)
    ↓
Phase 1.5: Regression Test First
    ↓
Phase 2: Implementation (confidence-based)
    ↓
Phase 3: Verification
    ↓
Phase 3.5: Additional Tests (optional)
    ↓
Definition of Done
```

## Confidence-Based Approach

| Confidence | Strategy                   |
| ---------- | -------------------------- |
| ≥90%       | Direct fix                 |
| 70-89%     | Defensive fix (add guards) |
| <70%       | Escalate → `/research`     |

## Applied Principles

- **Occam's Razor**: Simplest solution
- **TIDYINGS**: Clean only what you touch
- **CSS-first**: For UI issues
- **TDD**: Test-first for bugs

## IDR

`/fix` does NOT generate IDR - use `/code` for features needing decision tracking.

## Next Steps

- **Success** → Commit changes
- **Partial** → Follow-up `/fix`
- **Escalation** → `/think` → `/code`
