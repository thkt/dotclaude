# Canonical Finding Schema

Base fields required from all audit sub-reviewers. Leader (Medium tier) or Integrator (Large tier) normalizes domain-specific extensions during integration.

## Base Fields (required)

Per finding, output a Markdown heading followed by a single table.

### {PREFIX}-{seq}

| Field        | Value                                                | Source      |
| ------------ | ---------------------------------------------------- | ----------- |
| Agent        | reviewer-name                                        | auto-filled |
| Severity     | critical / high / medium / low                       | reviewer    |
| Category     | domain-specific category                             | reviewer    |
| Location     | `file:line`                                          | reviewer    |
| Evidence     | code snippet or observation                          | reviewer    |
| Trigger      | concrete condition that causes the issue to manifest | reviewer    |
| Reasoning    | why this is an issue                                 | reviewer    |
| Fix          | suggested fix                                        | reviewer    |
| Verification | check type — question                                | reviewer    |

### Agent (auto-fill)

The integrator/leader populates `Agent` from the spawning reviewer's `name:` frontmatter. Reviewers MUST NOT repeat their own name in the output; omit the Agent row entirely.

### Trigger vs Reasoning

These are distinct fields. Do not merge them.

| Field     | Question       | Example                                                                          |
| --------- | -------------- | -------------------------------------------------------------------------------- |
| Trigger   | When does it fire? | "Every Bash tool call (PreToolUse hook runs on every invocation)"            |
| Reasoning | Why is it bad? | "awk fork+exec on hot path costs 2-5ms before the case filter can short-circuit" |

If Trigger is identical to Reasoning's opening clause, the finding is too abstract — restate Trigger as an observable condition that a verifier could reproduce.

### Reporting Bar

Report a finding only when all of the following hold. Otherwise, do not report.

- The reviewer can state the issue without hedging language (no "might", "could", "possibly")
- A concrete trigger and reasoning can both be written (see Language Constraints)
- The reviewer read the target file and confirmed the condition in current code

security-reviewer has a lower bar: include a finding even when exploitability is uncertain, provided a concrete fix suggestion accompanies it.

### Pre-Report Verification

Before reporting any finding, the reviewer MUST do the following.

1. Read the target file at the reported location (± 20 lines context)
2. Confirm the issue exists in the actual code, not from memory or assumption
3. A finding without a prior file read is invalid — the leader discards it

### Language Constraints

Evidence, Trigger, and Reasoning fields MUST use concrete language.

| Prohibited             | Replace with                        |
| ---------------------- | ----------------------------------- |
| might, could, possibly | does, causes, results in            |
| potentially            | when [condition], [consequence]     |
| may cause              | causes [X] when [Y]                 |
| theoretically          | (remove — describe the actual path) |
| in some cases          | when [specific condition]           |

## Calibration Filters

Apply in order. If any filter excludes, do not report.

| Filter              | Question                                                        | Exclude when                                       |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Senior Engineer     | Would a senior engineer request a change?                       | "Depends on preference" or "wouldn't block the PR" |
| Harm                | Concrete trigger for bug/data loss/security/maintenance burden? | Cannot name one                                    |
| Fix Proportionality | Fix proportional to risk?                                       | Significant refactoring for low-severity issue     |

### Context Test

| Context         | Action                                                            |
| --------------- | ----------------------------------------------------------------- |
| Cold path       | Exclude unless severity >= high                                   |
| Intentional     | Code comments, error messages, or naming suggest intent → exclude |
| Framework idiom | Follows framework/library convention → exclude                    |
| Indirect cover  | Tested through caller or integration test → exclude (TC)          |
| Semantic differ | Structurally similar but different business logic → exclude (DRY) |

Each reviewer's Calibration section has domain-specific REPORT/SKIP examples. When uncertain, prefer SKIP — the challenger exists to catch false negatives, but false positives waste pipeline capacity.

## Overview Table

When multiple findings exist, prepend this summary table.

| ID  | Severity | Category | Location |
| --- | -------- | -------- | -------- |

## Domain-Specific Extensions (normalized during integration)

Reviewers not listed use base fields only.

| Reviewer               | Extra Fields                                      | Req/Opt | Normalization                                                  |
| ---------------------- | ------------------------------------------------- | ------- | -------------------------------------------------------------- |
| root-cause-reviewer    | five_whys, root_cause                             | req     | root_cause → reasoning; five_whys → append to evidence         |
| progressive-enhancer   | recommendations                                   | req     | Append as separate items                                       |
| code-quality-reviewer  | subcategory                                       | opt     | Append to category as category/subcategory                     |
| performance-reviewer   | impact                                            | opt     | Append to evidence; impact → reasoning note                    |
| accessibility-reviewer | wcag (req), apg_pattern (req), code_example (opt) | req/opt | wcag → evidence; apg_pattern, code_example → fix context       |
| test-coverage-reviewer | related_code, criticality                         | opt     | related_code → evidence; criticality → reasoning note          |
| type-design-reviewer   | type_name, scores                                 | opt     | Append to evidence; scores → reasoning note                    |
| security-reviewer      | entry_points (in hint)                            | opt     | Already in verification_hint                                   |
| chaos-engineer         | blast_radius, failure, hypothesis                 | req     | blast_radius replaces severity; failure+hypothesis → reasoning |
| duplication-reviewer   | multi_location_evidence                           | req     | Evidence lists all source locations                            |
| reuse-reviewer         | existing_code                                     | req     | Evidence pairs new code with existing alternative              |
| efficiency-reviewer    | path_frequency                                    | opt     | hot/warm/cold → reasoning note                                 |
| type-safety-reviewer   | type_coverage, strict_flags                       | opt     | Summary-level metrics only                                     |

## ID Prefix Registry

| Prefix | Reviewer                                   |
| ------ | ------------------------------------------ |
| SEC    | security-reviewer                          |
| SF     | silent-failure-reviewer                    |
| TS     | type-safety-reviewer                       |
| TD     | type-design-reviewer                       |
| CQ     | code-quality-reviewer                      |
| PE     | progressive-enhancer                       |
| RC     | root-cause-reviewer / integrator synthesis |
| DP     | design-pattern-reviewer                    |
| TEST   | testability-reviewer                       |
| TC     | test-coverage-reviewer                     |
| PERF   | performance-reviewer                       |
| A11Y   | accessibility-reviewer                     |
| DRY    | duplication-reviewer                       |
| REUSE  | reuse-reviewer                             |
| EFF    | efficiency-reviewer                        |
| DOC    | document-reviewer                          |
| OPS    | operational-readiness-reviewer             |
| PQ     | prompt-reviewer                            |
| CHX    | chaos-engineer                             |
| PF     | pre-flight (not an agent file)             |

## Consolidation Rule

When the same pattern appears in multiple locations, apply these rules.

- Report as a SINGLE finding
- List all locations in evidence (max 5, then "and N more")
- Set severity to the highest among occurrences

Example: "Unused import in 7 files" → 1 finding, severity from worst case

## Default Error Handling

All reviewers apply the following unless overridden in their own definition.

| Error      | Action                                   |
| ---------- | ---------------------------------------- |
| Glob empty | Report 0 files found, do not infer clean |
| Tool error | Log error, skip file, note in summary    |

Domain-specific guards (missing input, unavailable dependency) remain in each reviewer's own `## Error Handling` section.
