# Canonical Finding Schema

Base fields required from all audit sub-reviewers. Leader (Medium tier) or
Integrator (Large tier) normalizes domain-specific extensions during
integration.

## Base Fields (required)

Per finding, output as Markdown heading + single table:

### {PREFIX}-{seq}

| Field        | Value                                                |
| ------------ | ---------------------------------------------------- |
| Agent        | reviewer-name                                        |
| Severity     | critical / high / medium / low                       |
| Category     | domain-specific category                             |
| Location     | `file:line`                                          |
| Confidence   | 0.70–1.00                                            |
| Evidence     | code snippet or observation                          |
| Trigger      | concrete condition that causes the issue to manifest |
| Reasoning    | why this is an issue                                 |
| Fix          | suggested fix                                        |
| Verification | check type — question                                |

### Confidence Floor

| Condition                     | Action        |
| ----------------------------- | ------------- |
| Confidence < 0.70             | Do not report |
| Cannot assess confidence      | Do not report |
| Requires speculative language | Do not report |

security-reviewer may define stricter thresholds in its own definition.

### Pre-Report Verification

Before reporting any finding, the reviewer MUST:

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

Each reviewer's Calibration section has domain-specific REPORT/SKIP examples.
When uncertain, prefer SKIP — the challenger exists to catch false negatives,
but false positives waste pipeline capacity.

## Overview Table

When multiple findings exist, prepend a summary table:

| ID  | Severity | Category | Location | Confidence |
| --- | -------- | -------- | -------- | ---------- |

## Domain-Specific Extensions (normalized during integration)

Reviewers not listed use base fields only.

| Reviewer               | Extra Fields                                      | Req/Opt | Normalization                                            |
| ---------------------- | ------------------------------------------------- | ------- | -------------------------------------------------------- |
| root-cause-reviewer    | five_whys, root_cause                             | req     | root_cause → reasoning; five_whys → append to evidence   |
| progressive-enhancer   | recommendations                                   | req     | Append as separate items                                 |
| code-quality-reviewer  | subcategory                                       | opt     | Append to category as category/subcategory               |
| performance-reviewer   | impact                                            | opt     | Append to evidence; impact → reasoning note              |
| accessibility-reviewer | wcag (req), apg_pattern (req), code_example (opt) | req/opt | wcag → evidence; apg_pattern, code_example → fix context |
| test-coverage-reviewer | related_code, criticality                         | opt     | related_code → evidence; criticality → reasoning note    |
| type-design-reviewer   | type_name, scores                                 | opt     | Append to evidence; scores → reasoning note              |
| security-reviewer      | entry_points (in hint)                            | opt     | Already in verification_hint                             |
| subagent-reviewer      | (none)                                            | —       | No normalization needed                                  |
| sow-spec-reviewer      | deductions                                        | req     | Append to evidence as deduction log                      |

## ID Prefix Registry

| Prefix | Reviewer                       |
| ------ | ------------------------------ |
| SEC    | security-reviewer              |
| SF     | silent-failure-reviewer        |
| TS     | type-safety-reviewer           |
| TD     | type-design-reviewer           |
| CQ     | code-quality-reviewer          |
| PE     | progressive-enhancer           |
| RCA    | root-cause-reviewer            |
| DP     | design-pattern-reviewer        |
| TEST   | testability-reviewer           |
| TC     | test-coverage-reviewer         |
| PERF   | performance-reviewer           |
| A11Y   | accessibility-reviewer         |
| DRY    | duplication-reviewer           |
| REUSE  | reuse-reviewer                 |
| EFF    | efficiency-reviewer            |
| DOC    | document-reviewer              |
| SA     | subagent-reviewer              |
| OPS    | operational-readiness-reviewer |
| SOW    | sow-spec-reviewer              |
| PQ     | prompt-reviewer                |
| PF     | pre-flight (not an agent file) |

## Consolidation Rule

When the same pattern appears in multiple locations:

- Report as a SINGLE finding
- List all locations in evidence (max 5, then "and N more")
- Set severity to the highest among occurrences

Example: "Unused import in 7 files" → 1 finding, severity from worst case
