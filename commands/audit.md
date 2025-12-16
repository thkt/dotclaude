---
description: >
  Orchestrate multiple specialized review agents with confidence-based filtering.
  Use after code changes or when comprehensive quality assessment is needed.
  All findings include evidence (file:line) and confidence markers (✓/→/?).
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: inherit
argument-hint: "[target files or scope]"
dependencies: [audit-orchestrator]
---

# /audit - Code Review Orchestrator

## Purpose

Orchestrate specialized review agents with confidence-based filtering and evidence requirements.

## Dynamic Context

### Git Status

```bash
!`git status --porcelain 2>/dev/null || echo "(not a git repository)"`
```

### Files Changed

```bash
!`git diff --name-only HEAD 2>/dev/null | head -10`
```

### Spec Reference (Auto-Detection)

Search for spec.md:

- `.claude/workspace/planning/**/spec.md`

**If spec.md exists**: Verify implementation aligns with FR-xxx requirements.
**If not**: Review proceeds with code-only analysis.

## Execution

Invoke audit-orchestrator:

```typescript
Task({
  subagent_type: "audit-orchestrator",
  description: "Comprehensive code review",
  prompt: `
Execute code review:

### Context
- Changed files: ${gitDiff}
- Specification: ${specContext || "none"}

### Review Process
1. Context Discovery: Analyze repo structure, tech stack
2. Parallel Reviews: Launch specialized agents concurrently
3. Filter & Consolidate: Apply confidence filters (>0.7)

### Agents to Invoke
- structure-reviewer, readability-reviewer
- type-safety-reviewer, testability-reviewer
- performance-reviewer, accessibility-reviewer
- design-pattern-reviewer, progressive-enhancer

### Output Requirements
- Evidence required: file:line for all findings
- Confidence markers: ✓ (>0.8), → (0.5-0.8)
- Group by severity: Critical, High, Medium, Low
- Report in Japanese
  `
})
```

## Review Agents

| Agent | Focus |
|-------|-------|
| `structure-reviewer` | Code organization, DRY, coupling |
| `readability-reviewer` | Clarity, naming, complexity |
| `type-safety-reviewer` | TypeScript coverage, any usage |
| `testability-reviewer` | Test design, coverage gaps |
| `performance-reviewer` | Bottlenecks, bundle size |
| `accessibility-reviewer` | WCAG, keyboard nav, ARIA |
| `design-pattern-reviewer` | Pattern consistency |
| `progressive-enhancer` | CSS-first solutions |

## Confidence Markers

- **[✓]** High (>0.8): Verified with direct code evidence
- **[→]** Medium (0.5-0.8): Inferred with reasoning
- **[?]** Low (<0.5): Not included in output

## Exclusion Rules

**Automatic Exclusions**:

- Style/formatting (handled by linters)
- Test files (unless requested)
- Generated/vendor code
- Theoretical issues without exploitation path
- Micro-optimizations without measurable impact

## Output Format

```text
Review Summary
- Files Reviewed: [count]
- Total Issues: Critical [X] / High [X] / Medium [X]
- Overall Confidence: [✓/→] [score]

## ✓ Critical Issues 🚨 (Confidence > 0.9)

### Issue #1: [Title]
- File: path/to/file.ts:42
- Evidence: [specific code or pattern]
- Impact: [user/system impact]
- Recommendation: [fix with example]

## ✓ High Priority ⚠️ (Confidence > 0.8)
[issues...]

## → Medium Priority 💡 (Confidence 0.7-0.8)
[issues with inference reasoning...]

Recommended Actions
1. Immediate [✓]: [critical fixes]
2. Next Sprint [→]: [high priority]
3. Backlog [→]: [improvements]
```

## Review Strategies

| Strategy | Time | Focus | Command |
|----------|------|-------|---------|
| Quick | 2-3 min | Security, critical bugs | `/audit --quick` |
| Standard | 5-7 min | + Performance, types, tests | `/audit` |
| Deep | 10+ min | + Root cause, tech debt | `/audit --deep` |
| Focused | varies | Specific area | `/audit --security` |

## Usage Examples

```bash
# Standard review
/audit

# Security audit
/audit --security --deep

# Target scope
/audit "src/components"

# Compare to main
/audit --compare main
```

## Best Practices

1. **Evidence required**: Always include file:line
2. **Mark confidence**: ✓ for verified, → for inferred
3. **Focus on high confidence**: Prioritize ✓ issues
4. **Validate inferences**: Verify → findings before fixing
5. **Review incrementally**: Small, frequent > large, rare

## Next Steps

After review:

- **Critical** → `/hotfix`
- **Bugs** → `/fix`
- **Refactoring** → `/think` → `/code`
- **Tests** → `/test`
