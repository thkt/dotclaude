# Templates

Structural templates referenced by commands.

## Planning Workflow

```mermaid
flowchart LR
    subgraph Commands
        R["/research"] --> T["/think"] --> C["/code"] --> A["/audit"] --> P["/polish"] --> V["/validate"]
    end
    subgraph Outputs
        R -.-> F[findings]
        T -.-> S["SOW + Spec"]
    end
    subgraph Hooks
        SE[session-end] -.-> IDR[idr.md]
    end
```

| Phase          | Command   | Output          | Template             |
| -------------- | --------- | --------------- | -------------------- |
| Research       | /research | findings        | research/template.md |
| Planning       | /think    | sow.md, spec.md | sow/, spec/          |
| Implementation | /code     | -               | -                    |
| Review         | /audit    | -               | -                    |
| Polish         | /polish   | -               | -                    |
| Validation     | /validate | -               | -                    |
| Session End    | (hook)    | idr.md          | idr/template.md      |

## Directory Structure

```text
templates/
├── README.md
├── adr/               # ADR templates
│   ├── architecture-pattern.md
│   ├── deprecation.md
│   ├── process-change.md
│   └── technology-selection.md
├── docs/              # Documentation templates
│   ├── api.md
│   ├── architecture.md
│   ├── domain.md
│   └── setup.md
├── issue/             # GitHub Issue templates
│   ├── bug.md
│   ├── chore.md
│   ├── docs.md
│   └── feature.md
├── research/
│   └── template.md    # Research findings
├── sow/
│   └── template.md    # Statement of Work
├── spec/
│   └── template.md    # Specification
└── idr/
    └── template.md    # Implementation Decision Record
```

## Document Responsibilities

| Document | Role                          | Audience | Update Frequency      |
| -------- | ----------------------------- | -------- | --------------------- |
| **SOW**  | Planning, criteria, design    | AI       | Static after approval |
| **Spec** | Implementation details, tests | AI       | Static after approval |
| **IDR**  | Implementation records        | Human    | Dynamic (append-only) |

## Customization

1. Maintain required sections (## headers)
2. Use confidence markers: [✓] ≥95%, [→] 70-94%, [?] <70%
3. Use ID conventions: I-001, AC-001, FR-001, T-001, NFR-001
