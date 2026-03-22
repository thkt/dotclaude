# Pre-flight: Tests + Hook Findings

Static analysis is delegated to the `reviews` hook (knip, oxlint, tsgo,
react-doctor via ADR-0013). Pre-flight focuses on test execution and converting
hook output to findings.

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

Common names: `test`, `test:unit`, `test:ci`, `spec`

Fallback: If no runner found, check for test frameworks via `command -v`:

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

Run test suite with coverage if available.

Record results in snapshot `pre_flight`:

| Field    | Source                                      |
| -------- | ------------------------------------------- |
| tests    | test output → total/passed/failed counts    |
| coverage | coverage report → c0 (line) / c1 (branch) % |

If test runner or coverage tool is unavailable, record as `skipped`.

## Step 4: Convert hook output to findings

If a PreToolUse(Skill) hook injects `additionalContext` (e.g., `claude-reviews`
per ADR-0013), parse each tool section and convert to `PF-{seq}` findings using
the finding-schema.md base fields.

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| `finding_id` | `PF-{seq}` (sequential across all tools) |
| `agent`      | `pre-flight`                             |

Category naming convention:

| Tool         | Category pattern                                                           | Default severity                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| knip         | `unused-file`, `unused-export`, `unused-dependency`, `unlisted-dependency` | `unlisted` → high, `unused-file` → medium, others → low |
| oxlint       | `lint/{rule-name}`                                                         | `error` → high, `warning` → medium                      |
| tsgo         | `type-error/TS{code}`                                                      | high                                                    |
| react-doctor | `react/{issue-type}`                                                       | medium                                                  |
| (unknown)    | `preflight/{tool-name}`                                                    | low                                                     |

Apply the consolidation rule from finding-schema.md (same pattern → single
finding).
