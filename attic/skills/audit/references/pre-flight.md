# Pre-flight: Tests + Hook Findings

Pre-flight runs tests and converts `reviews` hook output (knip/oxlint/tsgo/react-doctor) into findings. Static analysis lives in the hook, not here.

## Step 1: Detect task runner from project root

| File             | Runner                  |
| ---------------- | ----------------------- |
| `package.json`   | npm / yarn / pnpm / bun |
| `composer.json`  | composer                |
| `Makefile`       | make                    |
| `Taskfile.yml`   | task                    |
| `Cargo.toml`     | cargo                   |
| `pyproject.toml` | poetry / uv / ruff      |
| `Gemfile`        | bundle exec             |

## Step 2: Find test script in detected runner

Check these names in priority order and use the first match.

1. `test`
2. `test:unit`
3. `test:ci`
4. `spec`

If no runner found, fall back to `command -v` framework detection.

| Config File                     | Tool Check          | Command          |
| ------------------------------- | ------------------- | ---------------- |
| `vitest.config.*`               | `command -v npx`    | `npx vitest run` |
| `jest.config.*`                 | `command -v npx`    | `npx jest`       |
| `pytest.ini` / `pyproject.toml` | `command -v pytest` | `pytest`         |
| `Cargo.toml`                    | `command -v cargo`  | `cargo test`     |

## Step 3: Run tests

| Rule          | Behavior                                      |
| ------------- | --------------------------------------------- |
| No test found | Skip pre-flight tests, proceed to agents      |
| Non-zero exit | Capture output as context, do NOT block audit |
| Timeout       | 60s per script; kill and proceed on timeout   |

Record to snapshot `pre_flight` (with coverage if available; missing tool → `skipped`).

| Field    | Source                                      |
| -------- | ------------------------------------------- |
| tests    | test output → total/passed/failed counts    |
| coverage | coverage report → c0 (line) / c1 (branch) % |

## Step 4: Convert hook output to findings

| Hook state                                 | Action                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Injected `additionalContext`               | Parse each tool section → `PF-{seq}` findings with `status: static` (finding-schema.md base fields) |
| Absent (not installed, no-op, no findings) | Record `hook_findings: 0` in snapshot; do NOT fail pre-flight                                       |

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| `finding_id` | `PF-{seq}` (1-based, sequential across tools per pre-flight) |
| `agent`      | `pre-flight`                                                 |
| `status`     | `static` (mechanically confirmed by deterministic tool)      |

Category naming convention by tool.

| Tool         | Category pattern                                                           | Default severity                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, others → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                      |
| tsgo         | `type-error/TS{code}`                                                      | high                                                    |
| react-doctor | `react/{issue-type}`                                                       | medium                                                  |
| (unknown)    | `preflight/{tool-name}`                                                    | low                                                     |

Apply the consolidation rule from finding-schema.md (same pattern → single finding) within PF findings only. PF and Wave 1 stay separate (see Pipeline Treatment).

## Pipeline Treatment of PF Findings

PF findings (`status: static`) skip challenger/verifier because deterministic tools provide their own evidence. They flow directly to the integrator alongside Wave 1 reconciled findings.

| Stage      | PF treatment                                              |
| ---------- | --------------------------------------------------------- |
| challenger | Skip. Mechanically confirmed                              |
| verifier   | Skip. Tool output is itself the evidence                  |
| root-cause | Include. PF findings can seed root cause analysis         |
| integrator | Receive directly. Cross-reference with Wave 1 (see below) |

### Wave 1 Cross-reference

When a Wave 1 finding lands at the same `file:line` (overlap ±3, same tolerance as Multi-run Aggregation in `SKILL.md`) as a PF finding, the integrator appends a cross-reference to the Wave 1 finding's evidence.

`Static-confirmed by ${PF-id} (${PF.category})`

Both findings remain in the snapshot. PF stays `status: static`, Wave 1 keeps its reconciled status. The cross-reference lets `output.md` render the relationship without merging entries. This treats overlap as a strengthened signal, not a duplicate to dismiss.
