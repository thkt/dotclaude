# Snapshot Schema

Canonical source of an `/audit` run. Per ADR 0047.

${CLAUDE_SKILL_DIR}/templates/output.md is a rendered view derived from a snapshot. Do not surface output fields that cannot be traced back to snapshot data.

## Location

${CLAUDE_SKILL_DIR}/../../workspace/history/audit-YYYY-MM-DD-HHmmss.json

One file per audit run. Filename timestamp is UTC.

## Top-level Fields

| Field             | Type          | Required | Description                                             |
| ----------------- | ------------- | -------- | ------------------------------------------------------- |
| `session_id`      | string        | yes      | UUID. Captured by Leader at audit start                 |
| `timestamp`       | string        | yes      | ISO 8601. Captured by Leader                            |
| `branch`          | string        | yes      | git branch at audit time                                |
| `target`          | string        | yes      | audited scope. files, SHA range, or description         |
| `focus`           | enum          | yes      | `security` / `performance` / `quality` / `a11y` / `all` |
| `pre_flight`      | object        | yes      | see Pre-flight                                          |
| `raw_findings`    | array         | yes      | see Raw Findings                                        |
| `findings`        | array         | yes      | see Finding Entry                                       |
| `summary`         | object        | yes      | see Summary                                             |
| `pipeline_health` | object        | yes      | see Pipeline Health                                     |
| `delta_from`      | string / null | yes      | previous snapshot filename, or null on first run        |
| `delta`           | object        | yes      | see Delta                                               |

## Pre-flight

| Field      | Type           | Description                                              |
| ---------- | -------------- | -------------------------------------------------------- |
| `tests`    | object         | `{ total, pass, fail, ignored }`. Omit if no test runner |
| `build`    | enum           | `pass` / `fail` / `skipped`                              |
| `clippy`   | string         | `clean` / `N warnings` / `skipped`. Rust only            |
| `fmt`      | string         | `clean` / `N drifts` / `skipped`                         |
| `coverage` | enum or object | `skipped`, or `{ c0: "N%", c1: "N%" }`                   |

## Raw Findings

Wave 1 reviewer output before challenge and dedupe. Reconciliation erases per-reviewer detail (dismissed findings lose their content; integrator merges convergent ones), which made post-hoc overlap measurement impossible until the 2026-06-04 pilot recovered it from transcripts (`workspace/history/overlap-pilot-2026-06-04.md`). This section keeps that data addressable per run.

One entry per finding as emitted by each Wave 1 reviewer. No `status` — these precede reconciliation.

Trust boundary: this section is a best-effort convenience index transcribed by the Leader (an LLM), so silent omission is possible and nothing validates completeness. The session transcript (Task results in the session jsonl) remains the authoritative source; extraction procedure in the pilot report above. Before using `raw_findings` for measurement, cross-check entry counts per reviewer against the transcript.

| Field      | Type   | Description                                                                                                |
| ---------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `reviewer` | string | subagent_type (e.g. `reviewer-duplication`)                                                                |
| `id`       | string | reviewer-local ID as emitted (e.g. `DRY-001`). May differ from `findings` IDs after integrator renumbering |
| `file`     | string | repo-relative path with line. Same format as Finding Entry                                                 |
| `message`  | string | one-line claim. Strip evidence and fix detail                                                              |

## Finding Entry

Each entry is individually addressable. ID prefix registry lives in `finding-schema.md`. RC covers both Wave 1 reviewer-causation output and integrator synthesis.

| Field      | Type     | Required | Description                                                                  |
| ---------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `id`       | string   | yes      | `<PREFIX>-<NNN>`, 1-based sequential per prefix                              |
| `severity` | enum     | yes      | `critical` / `high` / `medium` / `low`                                       |
| `category` | string   | yes      | free-form descriptor (e.g. `structure/size`, `logging/format`)               |
| `file`     | string   | yes      | repo-relative path with line. `src/main.rs:42` or `src/lib.rs:10-24`         |
| `message`  | string   | yes      | one-line description of the concrete issue                                   |
| `status`   | enum     | yes      | see Status                                                                   |
| `resolves` | string[] | optional | RC entries only. IDs of findings this synthesis unifies                      |
| `effort`   | enum     | optional | `5min` / `15min` / `30min` / `1h` / `manual`. For RC and auto-fix candidates |
| `fix_type` | enum     | optional | `auto` / `manual`. `auto` when a known fix pattern applies without ambiguity |

### Status

| Value           | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| `open`          | Wave 1 raw, not yet reconciled                                                          |
| `confirmed`     | reconciled, evidence supports keeping                                                   |
| `dismissed`     | challenger rejected (false positive)                                                    |
| `needs_review`  | disputed by challenger but verified by verifier. Human judgement                        |
| `needs_context` | weak evidence plus budget exhausted                                                     |
| `static`        | PF finding from a deterministic tool. Skips challenger/verifier; mechanically confirmed |

## Summary

| Field            | Type | Description                                                                     |
| ---------------- | ---- | ------------------------------------------------------------------------------- |
| `total_findings` | int  | count of `{open, confirmed, needs_review}` findings (Wave 1, excludes `static`) |
| `critical`       | int  | severity count. omit row if 0                                                   |
| `high`           | int  | severity count. omit row if 0                                                   |
| `medium`         | int  | severity count. omit row if 0                                                   |
| `low`            | int  | severity count. omit row if 0                                                   |
| `dismissed`      | int  | findings dismissed by challenger                                                |
| `static_count`   | int  | findings with status `static` (PF only)                                         |
| `trust_score`    | int  | 0-100. see Trust Score                                                          |

### Trust Score

0-100. Priority-weighted convergence score over Wave 1 findings. Uses the integrator confidence floor (0.60), `severity_upgraded` audit trail, and cross-domain re-evaluation. `2× medium` does not justify `high`. Count alone never escalates severity. Formula details are integrator implementation. This schema only requires int 0-100.

## Pipeline Health

| Field                  | Type     | Description                                       |
| ---------------------- | -------- | ------------------------------------------------- |
| `reviewers_completed`  | int      | count of completed reviewer agents                |
| `root_cause_completed` | bool     | RC reviewer phase completion                      |
| `challenger_completed` | bool     | challenger phase completion                       |
| `verifier_completed`   | bool     | verifier phase completion                         |
| `integrator_completed` | bool     | integrator phase completion                       |
| `domains_skipped`      | string[] | list of `<domain>: <reason>`. see Skipped Domains |

### Skipped Domains

Each `domains_skipped` entry follows `<domain>: <reason>`. Each entry signals findings for that reviewer are absent from this audit. Reasons follow the Error Handling table in `SKILL.md` (`timeout`, `malformed_output`, `dependency_stall: {upstream}`). Surface to the user via the `Skipped reviewers` subsection in `output.md`.

## Delta

| Field               | Type       | Description                                      |
| ------------------- | ---------- | ------------------------------------------------ |
| `tests`             | string     | `N → N` or `unchanged`                           |
| `clippy`            | string     | `N warnings → 0` or `unchanged`                  |
| `fmt`               | string     | `N drifts → 0` or `unchanged`                    |
| `trust_score`       | string     | `N → N` or `unchanged`                           |
| `critical`          | string     | `+N`, `-N`, `0`, or `(first)` on first run       |
| `high`              | string     | same format as critical                          |
| `medium`            | string     | same format as critical                          |
| `low`               | string     | same format as critical                          |
| `findings_new`      | int        | findings present in this run, absent in previous |
| `findings_resolved` | int        | findings present in previous, absent in this run |
| `findings_prior`    | int / null | prior total, or null on first run                |

## Responsibility Split

| Section                                                | Filled by                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `session_id`, `timestamp`, `branch`, `target`, `focus` | Leader at audit start                                                    |
| `pre_flight`                                           | Leader from test runner and hook output                                  |
| `raw_findings`                                         | Leader from each Wave 1 Task result, before spawning challenger/verifier |
| `findings`, `summary`, `pipeline_health`               | Integrator                                                               |
| `delta_from`, `delta`                                  | Leader by comparing to previous snapshot                                 |

## Example

See ${CLAUDE_SKILL_DIR}/templates/snapshot.json.
