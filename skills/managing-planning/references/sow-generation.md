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
ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1

# If found, display:
📄 Using research context: [filename]
```

## Required Sections

| Section                | Purpose                      | Confidence         |
| ---------------------- | ---------------------------- | ------------------ |
| Executive Summary      | High-level overview          | [C: 0.7]           |
| Problem Analysis       | Current state, issues        | [C: 0.9+] verified |
| Assumptions            | Facts, assumptions, unknowns | Mixed levels       |
| Solution Design        | Approach, alternatives       | [C: 0.7-0.9]       |
| Test Plan              | Unit/Integration/E2E         | [C: 0.8]           |
| Acceptance Criteria    | By phase                     | [C: 0.9+]          |
| Implementation Plan    | Phases, progress matrix      | [C: 0.8]           |
| Success Metrics        | Measurable outcomes          | [C: 0.7]           |
| Risks & Mitigations    | By confidence level          | Mixed              |
| Verification Checklist | Pre-impl checks              | [C: 0.9+]          |

## Confidence Markers

| Range        | Meaning   | Evidence                  |
| ------------ | --------- | ------------------------- |
| [C: 0.9+]    | Verified  | file:line, command output |
| [C: 0.7-0.9] | Inferred  | Reasoning stated          |
| [C: <0.7]    | Uncertain | Needs investigation       |

## Progress Matrix (PDD Integration)

Enable Progress-Driven Development tracking:

```markdown
| Feature   | spec | design | impl | test | review | Progress |
| --------- | :--: | :----: | :--: | :--: | :----: | :------: |
| Feature A |  ⬜  |   ⬜   |  ⬜  |  ⬜  |   ⬜   |    0%    |

**Legend**: ⬜ none | 🔄 started | 📝 draft | 👀 reviewed | ✅ done
```

### Steps

| Step   | Description          | Criteria              |
| ------ | -------------------- | --------------------- |
| spec   | Requirements defined | SOW sections complete |
| design | Architecture decided | Solution approved     |
| impl   | Code implemented     | Core working          |
| test   | Tests passing        | All green             |
| review | Quality verified     | /audit passed         |

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
Save to: .claude/workspace/planning/[timestamp]-[feature]/sow.md

✅ SOW saved to: .claude/workspace/planning/[path]/sow.md
```

## Template

Structure reference: `~/.claude/templates/sow/workflow-improvement.md`

- ✅ Copy: Section structure, ID naming (I-001, AC-001, R-001)
- ❌ Do NOT copy: Actual content

## Related

- Spec generation: [@./spec-generation.md](./spec-generation.md)
- Think workflow: [@./think-workflow.md](./think-workflow.md)
