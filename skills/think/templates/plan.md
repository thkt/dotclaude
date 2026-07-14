# Plan Template

`/think` generates the Phase 3 draft `.claude/workspace/planning/YYYY-MM-DD-<slug>.plan.md` from this skeleton. `/issue` transfers both sections into the issue body as-is, so this skeleton is the issue's Plan section verbatim.

## Template

`{...}` is replaced with content at generation. The draft consists of exactly these 2 sections; keep the headings and bullet shapes intact. The build workflow maps the Plan section into build.js's EXTRACT_SCHEMA via LLM extraction and stops omissions and fabrications with a deterministic cross-check of the U-NNN / T-NNN id sets, so extraction stability rests on skeleton stability. No hidden machine block.

```markdown
## Plan

Outcome: {one line describing the done state; implementation-independent, observable}
test_command: {one-line test command, e.g. cargo test / node --test tests/}

### Preconditions

- {existing dependency, as path only or path + stable anchor: `src/storage/mod.rs` `open_db`}

### U-001 {unit title}

{One declarative goal line: the behavior this unit delivers}

- files: {`src/foo.rs`, `tests/foo.test.rs`}
- contract: {one citation line + one intent line}

Acceptance tests.

- T-001 {one-line statement of condition + expected result; becomes the test name}

## Backlog candidates

- {candidate to carve out of scope, one line each}
```

## Guidelines

Ids U-NNN / T-NNN are both sequential from 001. T-NNN is unique across the whole plan and never restarts per unit. List units in implementation order; the listed order is the implementation order. Each field's cap is the line count shown in the skeleton; resolve overflow by splitting, not by adding prose. Divide the unit, or carve out to backlog. Write acceptance tests on units that pin behavior. A unit with no verifiable behavior (docs / config) omits the whole "Acceptance tests." block, and build implements it directly instead of Red -> Green.

| Field         | OK                                                   | NG                                      |
| ------------- | ---------------------------------------------------- | --------------------------------------- |
| Outcome       | Search results render within 1 second                | Make search fast (not observable)       |
| Preconditions | `src/config.rs` `load_config`                        | A comment string inside src/config.rs   |
| contract      | Follow `search` in `src/query.rs`; add a limit param | Write out a new-signature code fragment |
| T-NNN         | An empty query returns an error                      | Verify it works correctly               |
