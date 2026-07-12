# Plan Section Format

Defines the format of the `## Plan` section in an issue body and the contract by which the build workflow (via think) extracts a structured plan from it. This is the shared source for the issue SKILL.md and build.js; change the format here first, then propagate to both. The Plan section consists of human-readable markdown only, with no hidden machine block.

## Plan section structure

| Element            | Location                 | Content                                                                                       |
| ------------------ | ------------------------ | --------------------------------------------------------------------------------------------- |
| Intro prose        | Directly under `## Plan` | One outcome line (done state, implementation-independent, observable) + one test_command line |
| Preconditions      | `### Preconditions`      | Bullet list of existing code the units depend on                                              |
| Unit subsections   | `### U-NNN` (sequential) | Declarative goal + files + contract prose + acceptance tests + dependencies                   |
| Backlog candidates | `## Backlog candidates`  | Bullet list of candidates to carve out of this issue's scope. "None" if empty                 |

Skeleton example.

```markdown
## Plan

Outcome: <one line describing the done state>
test_command: <one-line test command, e.g. cargo test / node --test tests/>

### Preconditions

- `src/storage/mod.rs` `open_db`
- `src/config.rs`

### U-001 <unit title>

<One declarative goal line: the behavior this unit delivers>

- files: `src/foo.rs`, `tests/foo.test.rs`
- contract: <public interface prose: signature / CLI flag / schema sketch>
- depends_on: none

Acceptance tests.

- T-001 <statement of the spec being verified; becomes the test name>
  - given: <initial state>
  - when: <action>
  - then: <expected result>

## Backlog candidates

- <candidate to carve out of scope>
```

### Id notation

| Id    | Target             | Rule                                                  |
| ----- | ------------------ | ----------------------------------------------------- |
| U-NNN | Unit (`### U-NNN`) | Sequential from 001. Unique within the plan           |
| T-NNN | Acceptance test    | Unique across the whole plan (not restarted per unit) |

### Precondition authoring rules

Apply these 5 rules to `### Preconditions`.

1. List existing dependencies only. Files newly created by a unit are never listed as preconditions
2. Anchors are limited to a single stable anchor (one exported / public symbol name) that `ugrep -F` matches as a literal fixed string. Do not anchor on private implementation details, comment strings, line numbers, or a slash-joined list of symbols; none of those match under `ugrep -F`
3. When no stable symbol exists, write the line as path only
4. Each line takes one of two forms: path only, or path + stable anchor
5. Paths are repo-root-relative (a path that drops a repo prefix like `workspace/` fails verification)

## Pre-posting verification

Before posting the issue, verify the paths the Plan section lists against the current codebase. Run every check from the same repository root as the build workflow's Revalidate.

1. Verify each `### Preconditions` line: paths via `test -f <path>`, anchors via `ugrep -F '<pattern>' <path>`. Fix or drop any failing line
2. Verify every `units[].files` entry that refers to an existing file with `test -f <path>`, and fix any failing path
3. If even one unit lists an existing file in `files`, the `### Preconditions` subsection needs at least one line. Treat an empty or absent subsection as a failure, not a pass, and add one precondition line anchoring the load-bearing dependency

## Extraction contract

The build workflow reads the Plan section and assembles a structured plan isomorphic to the think workflow's PLAN_SCHEMA. Each Plan section element maps to a field as follows. preconditions and backlog_candidates are not required fields of the think skill's structured plan; they are extra information the build workflow picks up from the Plan section. Extraction relies solely on markdown heading and bullet structure and requires no special marker or comment notation.

| Plan section element                              | Field                               | Type              |
| ------------------------------------------------- | ----------------------------------- | ----------------- |
| Planning dir (decided by the workflow)            | dir                                 | string            |
| Outcome line in the intro prose                   | outcome                             | string            |
| Decisions in the issue body                       | decisions                           | string[]          |
| Provisional marks / assumptions in the issue body | assumptions                         | string[]          |
| Non-goals in the issue body                       | non_goals                           | string[]          |
| Constraints in the issue body                     | constraints                         | string[]          |
| Sequence of `### U-NNN` subsections               | units                               | object[]          |
| U-NNN id                                          | units[].id                          | string            |
| Declarative goal line                             | units[].goal                        | string            |
| files bullet                                      | units[].files                       | string[]          |
| contract prose                                    | units[].contract                    | string            |
| Sequence of acceptance tests                      | units[].tests                       | object[]          |
| T-NNN id                                          | units[].tests[].id                  | string            |
| Test statement                                    | units[].tests[].name                | string            |
| given / when / then lines                         | units[].tests[].given / when / then | string            |
| depends_on line ("none" means empty array)        | units[].depends_on                  | string[]          |
| Each line under `### Preconditions`               | preconditions                       | object[]          |
| Path of a precondition line                       | preconditions[].path                | string            |
| Stable anchor of a precondition line              | preconditions[].pattern             | string (optional) |
| Each line under `## Backlog candidates`           | backlog_candidates                  | string[]          |
