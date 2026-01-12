---
description: Orchestrate specialized review agents for comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
argument-hint: "[target files or scope]"
dependencies: [audit-orchestrator, orchestrating-workflows]
---

# /audit - Code Review Orchestrator

Orchestrate specialized review agents with confidence-based filtering.

## Execution

```typescript
Task({
  subagent_type: "audit-orchestrator",
  description: "Comprehensive code review",
  prompt: `...`,
});
```

## Review Agents (15 total)

### Core (8)

| Agent                     | Focus                 |
| ------------------------- | --------------------- |
| `structure-reviewer`      | DRY, coupling         |
| `readability-reviewer`    | Clarity, naming       |
| `type-safety-reviewer`    | TypeScript coverage   |
| `silent-failure-reviewer` | Empty catch, Promise  |
| `design-pattern-reviewer` | Pattern consistency   |
| `progressive-enhancer`    | CSS-first solutions   |
| `testability-reviewer`    | Test design, coverage |
| `root-cause-reviewer`     | Root cause analysis   |

### pr-review-toolkit (4)

| Agent                   | Focus                 |
| ----------------------- | --------------------- |
| `silent-failure-hunter` | Error handling        |
| `comment-analyzer`      | Documentation quality |
| `type-design-analyzer`  | Type invariants       |
| `code-simplifier`       | Simplification        |

### Production (3)

| Agent                    | Focus          |
| ------------------------ | -------------- |
| `security-reviewer`      | OWASP          |
| `performance-reviewer`   | Bundle, render |
| `accessibility-reviewer` | WCAG, ARIA     |

## Confidence Markers

- [✓] ≥95% - Verified with code evidence
- [→] 70-94% - Inferred with reasoning
- [?] <70% - Not included

## Output Format

```text
Review Summary
- Files: [count] | Critical [X] / High [X] / Medium [X]

## Critical Issues
[issues with file:line]

## Medium Priority
[issues with reasoning]

Recommended Actions
1. Immediate [✓]
2. Next Sprint [→]
```

## IDR Update

After review, append `/audit` section to IDR with:

- Review summary
- Issues & actions
- Recommendations applied

## Usage

```bash
/audit                    # Full review
/audit "src/components"   # Target scope
```

## Next Steps

- **Critical** → `/fix`
- **Refactoring** → `/think` → `/code`
