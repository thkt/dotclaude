# Plan Draft Format

Defines the format of the draft /think writes to `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md`, and the contract by which the build workflow extracts a structured plan from it. This is the shared source for the think SKILL.md and build.js; change the format here first, then propagate to both. /issue transfers both sections of the draft into the issue body as-is, so this format is the issue's Plan section verbatim.

## Skeleton

The draft file consists of exactly these 2 sections.

```markdown
## Plan

Outcome: <one line describing the done state; implementation-independent, observable>
test_command: <one-line test command, e.g. cargo test / node --test tests/>

### Preconditions

- `src/storage/mod.rs` `open_db`
- `src/config.rs`

### U-001 <unit title>

<One declarative goal line: the behavior this unit delivers>

- files: `src/foo.rs`, `tests/foo.test.rs`
- contract: <one citation line + one intent line>

Acceptance tests.

- T-001 <one-line statement of condition + expected result; becomes the test name>

## Backlog candidates

- <candidate to carve out of scope, one line each>
```

U-NNN is sequential from 001 and unique within the plan. T-NNN is unique across the whole plan and never restarts per unit. List units in implementation order; the listed order is the implementation order.

## Line-count rules

Each field's cap is the line count shown in the skeleton. Resolve overflow by splitting, not by adding prose. Divide the unit, or carve out to backlog.

## Contract authoring rules

Select, do not generate. Never sketch behavior in prose or invent new code fragments; a contract is a citation plus an intent. A citation is verifiable, while a generated sketch is not.

1. Pick the citation in this priority order: an existing shape in the codebase > a docs/wiki page > a deep link to the API in the pinned version's official docs. Write a code shape as path + public symbol under the same stable-anchor rules as Preconditions. External-library citations follow SOURCING.md
2. Add what to follow and what to change relative to the citation as the one intent line. For a new shape with no citable source, do not invent a signature; keep the one intent line and leave the shape to implementation. Behavior is pinned by the acceptance tests
3. Cited paths + symbols also go into `### Preconditions`, putting them under pre-writeout verification and build's Revalidate

## Precondition authoring rules

Apply these 5 rules to `### Preconditions`.

1. List existing dependencies only. Files newly created by a unit are never listed as preconditions
2. Anchors are limited to a single stable anchor, one exported / public symbol name, that `ugrep -F` matches as a literal fixed string. Do not anchor on private implementation details, comment strings, line numbers, or a slash-joined list of symbols; none of those match under `ugrep -F`
3. When no stable symbol exists, write the line as path only
4. Each line takes one of two forms: path only, or path + stable anchor
5. Paths are repo-root-relative. A path that drops a repo prefix like `workspace/` fails verification

## Pre-writeout verification

Before writing out the draft, verify from the same repository root as the build workflow's Revalidate.

1. Verify each `### Preconditions` line: paths via `test -f <path>`, anchors via `ugrep -F '<pattern>' <path>`. Fix or drop any failing line
2. Verify every `units[].files` entry that refers to an existing file with `test -f <path>`, and fix any failing path
3. If even one unit lists an existing file in `files`, the `### Preconditions` subsection needs at least one line. Treat an empty or absent subsection as a failure, and add one precondition line anchoring the load-bearing dependency
4. Check for line-count rule overflow

## Extraction

The build workflow maps the transferred Plan section into build.js's EXTRACT_SCHEMA via LLM extraction, and stops omissions and fabrications with a fail-close validate plus a deterministic cross-check of the U-NNN / T-NNN id sets. What the writer must keep stable is this skeleton, not a field vocabulary; stable headings and bullets carry extraction stability. No hidden machine block.
