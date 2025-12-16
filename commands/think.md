---
description: >
  Orchestrate SOW and Spec generation. Creates both planning documents in sequence.
  Use for comprehensive planning. For single artifacts, use /sow or /spec directly.
allowed-tools: SlashCommand, Read, Write, Glob, Task
model: inherit
argument-hint: "[task description] (optional if research context exists)"
dependencies: [sow-spec-reviewer]
---

# /think - Planning Orchestrator

## Purpose

Orchestrate SOW and Spec generation as a single workflow.

## Golden Master Reference

Use for **structure and format guidance**:

- SOW structure: [@~/.claude/golden-masters/documents/sow/example-workflow-improvement.md]
- Spec structure: [@~/.claude/golden-masters/documents/spec/example-workflow-improvement.md]

**IMPORTANT**: Reference structures only, generate fresh content based on user's task.

## Input Resolution

Same as /sow - see /sow.md for details:

1. **Explicit argument**: Use directly
2. **Research context**: Auto-detect and use topic/findings
3. **Neither**: Ask user for task description

## Execution Flow

### Step 1: Generate SOW

```typescript
// If argument provided
SlashCommand({ command: '/sow "[task description]"' })

// If no argument (relies on /sow's input resolution)
SlashCommand({ command: '/sow' })
```

### Step 2: Generate Spec

```typescript
SlashCommand({ command: '/spec' })
// Auto-detects the SOW created in Step 1
```

### Step 3: Review (Optional)

```typescript
Task({
  subagent_type: "sow-spec-reviewer",
  model: "haiku",
  prompt: "Review the generated SOW and Spec for quality and consistency."
})
```

## Output

Both documents saved to:
`.claude/workspace/planning/[timestamp]-[feature]/`

```text
├── sow.md   # Statement of Work
└── spec.md  # Specification
```

Display after completion:

```text
✅ Planning complete:
   SOW:  .claude/workspace/planning/[path]/sow.md
   Spec: .claude/workspace/planning/[path]/spec.md
```

## When to Use

| Situation | Command |
|-----------|---------|
| Full planning (after research) | `/research` → `/think` |
| Full planning (explicit) | `/think "task description"` |
| SOW only | `/sow` or `/sow "task"` |
| Spec only (SOW exists) | `/spec` |
| View existing plans | `/plans` |

## Example

```bash
# After /research (recommended workflow)
/research "user authentication options"
/think  # Auto-detects research context

# With explicit argument
/think "Add user authentication with OAuth"

# No context, no argument → asks for input
/think
# → "What would you like to plan? Please provide a task description."
```

## Related Commands

- `/sow` - SOW generation only
- `/spec` - Spec generation only
- `/plans` - View planning documents
- `/code` - Implement based on spec
