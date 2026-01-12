# Think Workflow Orchestration

Full planning workflow: Research → Q&A → SOW → Spec.

## Workflow Flow

```text
/think [topic]
    │
    ├─ Research exists? ─NO──→ Run /research first
    │
    └─ Research ready
           │
           ├─ Q&A Clarification
           │     ├─ Gather requirements
           │     ├─ Confirm assumptions
           │     └─ Resolve unknowns
           │
           ├─ SOW Generation
           │     └─ Structure and acceptance criteria
           │
           └─ Spec Generation
                 └─ Implementation details
```

## Phase 1: Research Context

Check for existing research:

```bash
ls -t .claude/workspace/research/*-context.md 2>/dev/null | head -1
```

If not found, suggest: `/research [topic]` first.

## Phase 2: Q&A Clarification

Before generating documents, clarify via `AskUserQuestion`:

| Category    | Focus                         |
| ----------- | ----------------------------- |
| Purpose     | Goal, problem, beneficiary    |
| Users       | Primary users                 |
| Scope       | What's included/excluded      |
| Priority    | MoSCoW                        |
| Success     | "Done" definition             |
| Constraints | Technical, time, dependencies |
| Risks       | Known concerns                |

## Phase 3: SOW Generation

Invoke SOW generation:

**Reference**: [@./sow-generation.md](./sow-generation.md)

Key outputs:

- Problem analysis
- Solution design
- Acceptance criteria
- Implementation plan

## Phase 4: Spec Generation

After SOW is approved, generate Spec:

**Reference**: [@./spec-generation.md](./spec-generation.md)

Key outputs:

- Functional requirements
- Data model
- Test scenarios
- Traceability matrix

## Output Location

```text
.claude/workspace/planning/[timestamp]-[topic]/
├── sow.md       # Statement of Work
├── spec.md      # Implementation Specification
└── idr.md       # (Created later by /code)
```

## Completion

Display summary:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Planning Complete

📄 Documents Created:

- SOW: ./workspace/planning/[path]/sow.md
- Spec: ./workspace/planning/[path]/spec.md

📊 Quality:

- Confidence: [C: 0.XX]
- Traceability: AC → FR → Test complete

🚀 Next Steps:

- /code - Start implementation
- /plans - View all documents
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Related

- SOW generation: [@./sow-generation.md](./sow-generation.md)
- Spec generation: [@./spec-generation.md](./spec-generation.md)
- Validation: [@./validation-criteria.md](./validation-criteria.md)
