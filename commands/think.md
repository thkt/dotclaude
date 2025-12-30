---
description: Orchestrate SOW and Spec generation for comprehensive planning
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: inherit
argument-hint: "[task description] (optional if research context exists)"
dependencies: [sow-spec-reviewer]
---

# /think - Planning Orchestrator

## Purpose

Orchestrate implementation planning with automated design exploration followed by SOW and Spec generation.

## Template Reference

Use for **structure and format guidance**:

- SOW structure: [@~/.claude/templates/sow/workflow-improvement.md](~/.claude/templates/sow/workflow-improvement.md)
- Spec structure: [@~/.claude/templates/spec/workflow-improvement.md](~/.claude/templates/spec/workflow-improvement.md)
- Summary structure: [@~/.claude/templates/summary/review-summary.md](~/.claude/templates/summary/review-summary.md)

## Input Resolution

Same as /sow - see /sow.md for details:

1. **Explicit argument**: Use directly
2. **Research context**: Auto-detect and use topic/findings
3. **Neither**: Ask user for task description

## Execution Flow

### Step 0: Requirements Clarification (Conditional)

**Skip when**: Research context exists, detailed description provided, or follow-up task.

**When to ask**: Vague description, missing success criteria, unknown constraints.

#### Questions (5-7 from categories)

| Category | Question Focus |
| --- | --- |
| Purpose | Main goal, problem solved, who benefits |
| Users | Primary users (end users/internal/API) |
| Priority | MoSCoW (Must/Should/Could/Won't) |
| Success | "Done" definition, metrics |
| Constraints | Deadline, dependencies, restrictions |
| Scope | What's explicitly excluded |
| Edge Cases | Special scenarios to handle |

#### Known Information Filter

Before asking, extract known info from user input and skip already-answered questions:

```text
Input: "Add OAuth authentication for API consumers by next sprint"

Known: Purpose ✓, Users ✓, Constraints ✓
Ask: Priority, Success Criteria, Scope, Edge Cases
```

Save Q&A to: `.claude/workspace/qa/[timestamp]-[topic].md`

### Step 1: Implementation Design Exploration

Plan agent with Opus for architectural analysis:

```typescript
Task({
  subagent_type: "Plan",
  model: "opus",
  description: "SOW/Spec-aligned implementation analysis",
  prompt: `
Feature: "${featureDescription}"
${qaResults ? `Q&A results:\n${qaResults}\n` : ''}

Collect with confidence markers [✓]/[→]/[?]:

1. **Current State**: Quantitative baseline (file count, lines, patterns)
2. **Problems**: Classified by confidence level
3. **Solution Design**: 3 alternatives in table, recommendation
4. **Scope**: Files to modify (2-5), dependencies, phase plan
5. **Acceptance Criteria**: Measurable criteria with verification
6. **Risks**: Classified by confirmed/potential/unknown

Output format: Tables with evidence for each item.
  `
})
```

**Why Opus**: Deep architectural analysis and comprehensive trade-off evaluation.

### Step 2: Display Analysis Results

Show structured analysis (non-blocking), then auto-continue:

```text
🎯 Implementation Analysis

## Current State | Problem Summary | Recommended Approach
## Implementation Scope | Key Risks

Proceeding with SOW generation...
```

Data maps directly to SOW sections.

### Step 3-5: Generate Documents

```typescript
// Step 3: SOW
SlashCommand({ command: '/sow "[task description]"' })

// Step 4: Spec
SlashCommand({ command: '/spec' })

// Step 5: Review (optional)
Task({ subagent_type: "sow-spec-reviewer", model: "haiku" })
```

### Step 6: Generate Summary

Create concise review summary following Golden Master structure:

```markdown
# Summary: [Feature Name]

## 🎯 Purpose | 📋 Change Overview | 📁 Scope
## ❓ Discussion Points | ⚠️ Risks | ✅ Key Acceptance Criteria
## 🔗 Links to SOW/Spec
```

Output: `.claude/workspace/planning/[same-dir]/summary.md`

## Output

All documents saved to: `.claude/workspace/planning/[timestamp]-[feature]/`

```text
├── sow.md     # Statement of Work
├── spec.md    # Specification
└── summary.md # Review Summary ← Start here
```

## When to Use

| Situation | Command |
| --- | --- |
| Full planning (after research) | `/research` → `/think` |
| Full planning (explicit) | `/think "task description"` |
| SOW only | `/sow` |
| Spec only (SOW exists) | `/spec` |
| View existing plans | `/plans` |

## Example

```bash
# After /research (recommended)
/research "user authentication options"
/think  # Auto-detects research context

# With explicit argument
/think "Add user authentication with OAuth"
```

## Related Commands

- `/sow` - SOW generation only
- `/spec` - Spec generation only
- `/plans` - View planning documents
- `/code` - Implement based on spec
