---
description: Orchestrate specialized review agents for comprehensive code quality assessment
aliases: [review]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git show:*), Read, Glob, Grep, LS, Task
model: opus
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

### Agents to Invoke (Full Review Mode)

All agents run on every audit for maximum accuracy:

**Core Agents**:
- structure-reviewer, readability-reviewer, progressive-enhancer
- type-safety-reviewer, design-pattern-reviewer, testability-reviewer
- silent-failure-reviewer, root-cause-reviewer

**Enhanced Agents (pr-review-toolkit)**:
- silent-failure-hunter, comment-analyzer
- type-design-analyzer, code-simplifier

**Production Agents**:
- security-reviewer, performance-reviewer, accessibility-reviewer

### Output Requirements
- Evidence required: file:line for all findings
- Confidence markers: ✓ (>0.8), → (0.5-0.8)
- Group by severity: Critical, High, Medium, Low
- Report in Japanese
  `,
});
```

## Review Agents (15 total)

### Core Agents (8)

| Agent                     | Focus                            |
| ------------------------- | -------------------------------- |
| `structure-reviewer`      | Code organization, DRY, coupling |
| `readability-reviewer`    | Clarity, naming, complexity      |
| `type-safety-reviewer`    | TypeScript coverage, any usage   |
| `silent-failure-reviewer` | Empty catch, unhandled Promise   |
| `design-pattern-reviewer` | Pattern consistency              |
| `progressive-enhancer`    | CSS-first solutions              |
| `testability-reviewer`    | Test design, coverage gaps       |
| `root-cause-reviewer`     | Root cause analysis              |

### Enhanced Agents - pr-review-toolkit (4)

| Agent                   | Focus                                   | Complements             |
| ----------------------- | --------------------------------------- | ----------------------- |
| `silent-failure-hunter` | Detailed error handling analysis        | silent-failure-reviewer |
| `comment-analyzer`      | Comment quality, documentation rot      | (new category)          |
| `type-design-analyzer`  | Type design (invariants, encapsulation) | type-safety-reviewer    |
| `code-simplifier`       | Simplification suggestions              | readability-reviewer    |

### Production Agents (3)

| Agent                    | Focus                    |
| ------------------------ | ------------------------ |
| `security-reviewer`      | OWASP, vulnerabilities   |
| `performance-reviewer`   | Bottlenecks, bundle size |
| `accessibility-reviewer` | WCAG, keyboard nav, ARIA |

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

## Execution Time

| Category          | Agents |
| ----------------- | ------ |
| Core              | 8      |
| pr-review-toolkit | 4      |
| Production        | 3      |
| **Total**         | **15** |

_Agents run in parallel. Typical execution: ~3-5 min._

## Usage Examples

```bash
# Full review (all 15 agents)
/audit

# Target specific scope
/audit "src/components"
```

## Best Practices

1. **Evidence required**: Always include file:line
2. **Mark confidence**: ✓ for verified, → for inferred
3. **Focus on high confidence**: Prioritize ✓ issues
4. **Validate inferences**: Verify → findings before fixing
5. **Review incrementally**: Small, frequent > large, rare

## IDR Update

After review is complete, update the IDR (Implementation Decision Record) with audit results.

### IDR Requirement Check

Before updating IDR, check if it's required:

1. **Check spec.md** for `idr_required` field (Section 11)
2. **If `idr_required: false`** → Skip IDR update
3. **If `idr_required: true` or no spec** → Update IDR

### IDR Detection

For detailed logic: [@../references/commands/shared/idr-generation.md](../references/commands/shared/idr-generation.md)

Search for existing IDR:

1. `~/.claude/workspace/planning/**/idr.md` (SOW-related)
2. `~/.claude/workspace/idr/**/idr.md` (standalone)

### IDR Section Addition

Append `/audit` section to IDR:

```markdown
## /audit - [YYYY-MM-DD HH:MM]

### Review Summary

| Severity | Count | Resolved |
| -------- | ----- | -------- |
| Critical | X     | X        |
| High     | X     | X        |

### Issues & Actions

| #   | Issue   | Severity | File:Line    | Action         |
| --- | ------- | -------- | ------------ | -------------- |
| 1   | [issue] | High     | src/xxx.ts:1 | Fixed/Deferred |

### Recommendations Applied

- [applied recommendations]
```

## Next Steps

After review:

- **Critical/Bugs** → `/fix`
- **Refactoring** → `/think` → `/code`
- **Tests** → `/test`
