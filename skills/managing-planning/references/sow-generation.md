# SOW Generation Workflow

Statement of Work creation process with structured sections.

## Input Resolution

```text
/sow execution
    │
    ├─ Argument provided? ─YES──→ Use as task description
    │
    └─ No argument
           │
           ├─ Research context exists? ─YES──→ Use research findings
           │
           └─ None ──→ Ask user for task description
```

## Research Context Detection

```bash
# Check for recent research
ls -t .claude/workspace/research/*.md 2>/dev/null | head -1

# If found, display:
📄 Using research context: [filename]
```

## Required Sections

| Section                | Purpose                      |
| ---------------------- | ---------------------------- |
| Executive Summary      | High-level overview          |
| Problem Analysis       | Current state, issues        |
| Assumptions            | Facts, assumptions, unknowns |
| Solution Design        | Approach, alternatives       |
| Test Plan              | Unit/Integration/E2E         |
| Acceptance Criteria    | By phase                     |
| Implementation Plan    | Phases, milestones           |
| Success Metrics        | Measurable outcomes          |
| Risks & Mitigations    | Identified risks             |
| Verification Checklist | Pre-impl checks              |

## Confidence Markers

| Marker | Meaning   | Evidence                  |
| ------ | --------- | ------------------------- |
| [✓]    | Verified  | file:line, command output |
| [→]    | Inferred  | Reasoning stated          |
| [?]    | Uncertain | Needs investigation       |

## Codebase Analysis (Optional)

For existing projects, analyze:

```typescript
Task({
  subagent_type: "Plan",
  model: "haiku",
  prompt: `Feature: "${feature}"
Investigate: existing patterns, affected modules.
Return with confidence markers.`,
});
```

## Output

```text
Save to: .claude/workspace/planning/YYYY-MM-DD-[feature]/sow.md

✅ SOW saved to: .claude/workspace/planning/[path]/sow.md
```

## Template

Structure reference: `~/.claude/templates/sow/template.md`

- ✅ Copy: Section structure, ID naming (I-001, AC-001, R-001)
- ❌ Do NOT copy: Actual content

## Related

- Spec generation: [@./spec-generation.md](./spec-generation.md)
- Think workflow: [@./think-workflow.md](./think-workflow.md)
