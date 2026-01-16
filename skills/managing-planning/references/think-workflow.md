# Think Workflow

## Flow

```text
/think → Research check → Q&A Clarification → SOW → Spec
```

## Phase 1: Research Check

If no research exists: suggest `/research [topic]` first.

## Phase 2: Q&A Clarification

| Category    | Focus                         |
| ----------- | ----------------------------- |
| Purpose     | Goal, problem, beneficiary    |
| Users       | Primary users                 |
| Scope       | Included/excluded             |
| Priority    | MoSCoW                        |
| Success     | "Done" definition             |
| Constraints | Technical, time, dependencies |
| Risks       | Known concerns                |

## Phase 3: SOW Generation

Outputs: Problem analysis, solution design, acceptance criteria, implementation plan.

## Phase 4: Spec Generation

Outputs: Functional requirements, data model, test scenarios, traceability.

## Output Location

```text
.claude/workspace/planning/YYYY-MM-DD-[topic]/
├── sow.md   # Statement of Work
├── spec.md  # Implementation Specification
└── idr.md   # (Created later by /code)
```

## Next Steps

| Command  | Purpose              |
| -------- | -------------------- |
| `/code`  | Start implementation |
| `/plans` | View all documents   |
