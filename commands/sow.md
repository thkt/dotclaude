---
description: Generate Statement of Work (SOW) for planning complex tasks
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Write, Glob, Grep, LS, Task
model: inherit
argument-hint: "[task description] (optional if research context exists)"
dependencies: [formatting-audits]
---

# /sow - SOW Generator

## Purpose

Generate sow.md only (single artifact) for planning and analysis.

## Input Resolution

```text
/sow execution
    │
    ├─ Argument provided? ─YES──→ Use argument as task description
    │
    └─ No argument
           │
           ├─ Research context exists? ─YES──→ Extract topic from context, incorporate findings
           │
           └─ None ──→ Ask user:
                       "What would you like to plan? Please provide a task description."
```

### Research Context Detection

```bash
!`ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1 || ls -t ~/.claude/workspace/research/*-context.md 2>/dev/null | head -1 || echo "(no research context)"`
```

If found:

- Extract topic from context file
- Incorporate research findings into SOW
- Display: `📄 Using research context: [filename]`

## Golden Master Reference

Use for **structure and section order ONLY**:
[@~/.claude/golden-masters/documents/sow/example-workflow-improvement.md]

**IMPORTANT**:

- ✅ Copy: Section headers, marker usage (✓/→/?), table formats
- ❌ Do NOT copy: Actual content, specific values, examples from the reference
- Generate fresh content based on user's feature description

## Confidence Markers

Use throughout the document:

- **[✓]** Verified - Confirmed by evidence (code, logs, user reports)
- **[→]** Inferred - Reasonable deduction from analysis
- **[?]** Suspected - Requires investigation

## Codebase Analysis (Optional)

For non-greenfield projects, invoke Plan agent:

```typescript
Task({
  subagent_type: "Plan",
  model: "haiku",
  description: "Analyze codebase for feature context",
  prompt: `Feature: "${featureDescription}"
Investigate: existing patterns, affected modules, tech stack.
Return with markers: [✓] verified, [→] inferred, [?] unknown.`
})
```

## Required Sections

Follow Golden Master structure:

1. **Executive Summary** - High-level overview [→]
2. **Problem Analysis** - Current State [✓], Issues by confidence
3. **Assumptions & Prerequisites** - Facts [✓], Assumptions [→], Unknowns [?]
4. **Solution Design** - Approach, alternatives, recommendation
5. **Test Plan** - Unit/Integration/E2E with priority
6. **Acceptance Criteria** - By phase, with confidence markers
7. **Implementation Plan** - Phases with steps, **including Progress Matrix**
8. **Success Metrics** - Measurable outcomes
9. **Risks & Mitigations** - By confidence level
10. **Verification Checklist** - Pre-implementation checks
11. **References** - Related documents

## Progress Matrix (PDD Integration) - Optional

Include in Implementation Plan section. Enables Progress-Driven Development tracking.

> **Reference**: [進捗駆動開発（PDD）](https://zenn.dev/pipipi_dev/articles/20251224-progress-driven-development)
> PDD = 機能ごとの進捗を5段階ステップで可視化し、人間とAIが協調して効率的に開発を進める手法

### Format

```markdown
### Progress Matrix

| Feature | spec | design | impl | test | review | Progress |
| --- |:---:|:---:|:---:|:---:|:---:|:---:|
| Feature A | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 0% |
| Feature B | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 0% |

**Legend**: ⬜ none | 🔄 started | 📝 draft | 👀 reviewed | ✅ done
```

### Steps (5 columns)

| Step | Description | Completion Criteria |
| --- | --- | --- |
| spec | Requirements defined | SOW/Spec sections complete |
| design | Architecture decided | Solution Design approved |
| impl | Code implemented | Core functionality working |
| test | Tests passing | Unit/Integration tests green |
| review | Quality verified | /audit + /validate passed |

### Progress Calculation

- Each step = 20% (5 steps total)
- Status weights: ⬜=0%, 🔄=25%, 📝=50%, 👀=75%, ✅=100%
- Feature progress = (Σ step weights) / 5

### Usage

1. **Initial**: All features start with ⬜ in all columns
2. **During /code**: Update status as work progresses
3. **Review with /validate**: Verify matrix reflects actual state

## Output

Save to: `.claude/workspace/planning/[timestamp]-[feature]/sow.md`

```bash
# Detect output location
!`ls -d .claude/ 2>/dev/null && echo "Project-local" || echo "Global: ~/.claude/"`
```

Display after save:

```text
✅ SOW saved to: .claude/workspace/planning/[path]/sow.md
```

## Example

```bash
# With explicit argument
/sow "Add user authentication with OAuth"

# After /research (auto-detects context)
/research "user authentication options"
/sow  # Uses research context automatically

# No context, no argument → asks for input
/sow
# → "What would you like to plan? Please provide a task description."
```

## Next Steps

After SOW is created:

- `/spec` - Generate implementation specification
- `/plans` - View created documents
