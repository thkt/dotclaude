# Plan Section Format

Defines the format of the `## Plan` section in an issue body and the contract by which the build workflow extracts a structured plan from it. This is the shared source for the issue SKILL.md and build.js; change the format here first, then propagate to both. Extraction relies solely on markdown heading and bullet structure, with no hidden machine block.

## Skeleton

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

U-NNN is sequential from 001 and unique within the plan. T-NNN is unique across the whole plan (not restarted per unit). List units in implementation order; the listed order is the implementation order.

## Line-count rules

Each field's cap is the line count shown in the skeleton. Resolve overflow by splitting (divide the unit, carve out to backlog), not by adding prose.

## Contract authoring rules

Select, do not generate. Never sketch behavior in prose or invent new code fragments; a contract is a citation plus an intent. A citation is verifiable, while a generated sketch is not.

1. Pick the citation in this priority order: an existing shape in the codebase (path + public symbol, same stable-anchor rules as Preconditions) > a docs/wiki page > for an external library, a deep link to the API in the pinned version's official docs (per SOURCING.md)
2. Add one intent line (what to follow / what to change relative to the citation). For a new shape with no citable source, do not invent a signature; keep the one intent line and leave the shape to implementation. Behavior is pinned by the acceptance tests
3. Cited paths + symbols also go into `### Preconditions`, putting them under pre-posting verification and build's Revalidate

## Precondition authoring rules

Apply these 5 rules to `### Preconditions`.

1. List existing dependencies only. Files newly created by a unit are never listed as preconditions
2. Anchors are limited to a single stable anchor (one exported / public symbol name) that `ugrep -F` matches as a literal fixed string. Do not anchor on private implementation details, comment strings, line numbers, or a slash-joined list of symbols; none of those match under `ugrep -F`
3. When no stable symbol exists, write the line as path only
4. Each line takes one of two forms: path only, or path + stable anchor
5. Paths are repo-root-relative (a path that drops a repo prefix like `workspace/` fails verification)

## Pre-posting verification

Before posting the issue, verify from the same repository root as the build workflow's Revalidate.

1. Verify each `### Preconditions` line: paths via `test -f <path>`, anchors via `ugrep -F '<pattern>' <path>`. Fix or drop any failing line
2. Verify every `units[].files` entry that refers to an existing file with `test -f <path>`, and fix any failing path
3. If even one unit lists an existing file in `files`, the `### Preconditions` subsection needs at least one line. Treat an empty or absent subsection as a failure, and add one precondition line anchoring the load-bearing dependency
4. Fix any field exceeding the line-count rules by splitting

## Extraction

The build workflow maps the Plan section into its own schema (build.js's EXTRACT_SCHEMA) via LLM extraction, and stops omissions and fabrications with a fail-close validate plus a deterministic cross-check of the U-NNN / T-NNN id sets. What the writer must keep stable is this skeleton, not a field vocabulary; stable headings and bullets carry extraction stability.
