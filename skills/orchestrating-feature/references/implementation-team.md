# Phase 5: Implementation

## Parallel Decision

Read architect's Component Design → classify by Layer column → decide mode.

| Condition                          | Mode       | Action                      |
| ---------------------------------- | ---------- | --------------------------- |
| logic_files >= 2 AND ui_files >= 2 | Parallel   | Show Prompt: Impl Mode      |
| Otherwise                          | Sequential | Execute /code (skip prompt) |

## Layer Classification

| Layer  | Directories                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| shared | types/, constants/, config/                                                  |
| logic  | hooks/, utils/, services/, api/, repos/, schemas/, lib/, store/, middleware/ |
| ui     | components/, pages/, layouts/, views/, styles/, css/                         |

## Parallel Mode

### Team Structure

```text
/feature command (LEADER)
├── impl-logic  (unit-implementer, logic layer)
└── impl-ui     (unit-implementer, ui layer)
```

Agent: [unit-implementer.md](../../../agents/teams/unit-implementer.md)

### Workflow

| Step | Actor  | Action                                                     |
| ---- | ------ | ---------------------------------------------------------- |
| 1    | Leader | Implement shared layer first (types/, constants/, config/) |
| 2    | Leader | `Task(test-generator)`: generate ALL tests in skip state   |
| 3    | Leader | Assign tests to layers (by implementation file directory)  |
| 4    | Leader | `TeamCreate("impl-{timestamp}")`                           |
| 5    | Leader | TaskCreate x 2 (impl-logic, impl-ui)                       |
| 6    | Leader | Spawn 2 teammates via Task with `team_name`                |
| 7    | Impls  | RGRC cycle for assigned tests, DM status to leader         |
| 8    | Leader | Wait for both implementers to complete                     |
| 9    | Leader | Fix cross-layer issues (imports, wiring)                   |
| 10   | Leader | Execute /test for full suite + quality gates               |
| 11   | Leader | SendMessage `shutdown_request` to all teammates            |

### Implementer Task Prompt

Include in each implementer's Task prompt:

1. Unit assignment: `logic` or `ui`
2. Interface contracts from architect output
3. Assigned files (create + modify)
4. Assigned test files
5. Constraint: only modify assigned files
