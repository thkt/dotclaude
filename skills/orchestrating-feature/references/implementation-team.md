# Phase 5: Implementation

## Input

Read `architecture` from handoff.yaml → components, contracts, sow/spec paths.

## Parallel Decision

Classify components by Layer → decide mode.

From `architecture.components`: `logic_files` = `layer: logic`, `ui_files` = `layer: ui`.

| Condition                          | Mode       | Action                                    |
| ---------------------------------- | ---------- | ----------------------------------------- |
| logic_files >= 2 AND ui_files >= 2 | Parallel   | Show Prompt: Impl Mode                    |
| All components shared-layer only   | Sequential | Leader implements shared, skip sequencing |
| Otherwise                          | Sequential | Execute /code (skip prompt)               |

## Layer Classification

| Layer  | Directories                                                                  |
| ------ | ---------------------------------------------------------------------------- |
| shared | types/, constants/, config/                                                  |
| logic  | hooks/, utils/, services/, api/, repos/, schemas/, lib/, store/, middleware/ |
| ui     | components/, pages/, layouts/, views/, styles/, css/                         |

## Sequential Mode

Leader implements all via /code.

| Step | Action                                               |
| ---- | ---------------------------------------------------- |
| 1    | Implement shared layer (types/, constants/, config/) |
| 2    | /code for each component, ordered: logic → ui        |
| 3    | Pass SOW path from `architecture.sow_path` to /code  |
| 4    | /test for full suite after all components complete   |

## Parallel Mode

### Team Structure

```text
/feature command (LEADER)
├── impl-logic  (unit-implementer, logic layer)
└── impl-ui     (unit-implementer, ui layer)
```

Agent: [unit-implementer.md](../../../agents/teams/unit-implementer.md)

### Workflow

| Step | Actor  | Action                                                    |
| ---- | ------ | --------------------------------------------------------- |
| 1    | Leader | Implement shared layer (types/, constants/, config/)      |
| 2    | Leader | `Task(test-generator)`: generate ALL tests in skip state  |
| 3    | Leader | Assign tests to layers (by implementation file directory) |
| 4    | Leader | `TeamCreate("impl-{timestamp}")`                          |
| 5    | Leader | TaskCreate x 2 (impl-logic, impl-ui)                      |
| 6    | Leader | Spawn 2 teammates via Task with `team_name`               |
| 7    | Impls  | RGRC cycle for assigned tests, DM status to leader        |
| 8    | Leader | Wait for both implementers                                |
| 9    | Leader | Fix cross-layer issues (imports, wiring)                  |
| 10   | Leader | /test for full suite + quality gates                      |
| 11   | Leader | SendMessage `shutdown_request` to all teammates           |

### Implementer Task Prompt Contents

1. Unit: `logic` or `ui`
2. Interface contracts from architect
3. Assigned files (create + modify)
4. Assigned test files
5. Constraint: modify assigned files only

## Error Handling

See the Error Handling section in `/feature`.
