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

| Hook state                                 | Action                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Injected `additionalContext`               | Parse each tool section → `PF-{seq}` findings (finding-schema.md base fields) |
| Absent (not installed, no-op, no findings) | Record `hook_findings: 0` in snapshot; do NOT fail pre-flight                 |

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| `finding_id` | `PF-{seq}` (1-based, sequential across tools per pre-flight) |
| `agent`      | `pre-flight`                                                 |

Category naming convention by tool.

| Tool         | Category pattern                                                           | Default severity                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, others → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                      |
| tsgo         | `type-error/TS{code}`                                                      | high                                                    |
| react-doctor | `react/{issue-type}`                                                       | medium                                                  |
| (unknown)    | `preflight/{tool-name}`                                                    | low                                                     |

Apply the consolidation rule from finding-schema.md (same pattern → single finding).
