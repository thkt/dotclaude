# Canonical Finding Schema

Base fields required from all audit sub-reviewers. Leader (Medium tier) or
Integrator (Large tier) normalizes domain-specific extensions during
integration.

## Base Fields (required)

Per finding, output as Markdown heading + single table:

### {PREFIX}-{seq}

| Field        | Value                          |
| ------------ | ------------------------------ |
| Agent        | reviewer-name                  |
| Severity     | critical / high / medium / low |
| Category     | domain-specific category       |
| Location     | `file:line`                    |
| Confidence   | 0.60–1.00                      |
| Evidence     | code snippet or observation    |
| Reasoning    | why this is an issue           |
| Fix          | suggested fix                  |
| Verification | check type — question          |

### Confidence Floor

- Reviewers MUST NOT include findings with confidence < 0.60
- If confidence cannot be assessed, default to 0.60
- security-reviewer may define stricter thresholds in its own definition

## Overview Table

When multiple findings exist, prepend a summary table:

| ID  | Severity | Category | Location | Confidence |
| --- | -------- | -------- | -------- | ---------- |

## Domain-Specific Extensions (normalized during integration)

Reviewers not listed use base fields only.

| Reviewer               | Extra Fields                                      | Opt     | Normalization                                            |
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
| DOC    | document-reviewer              |
| SA     | subagent-reviewer              |
| OPS    | operational-readiness-reviewer |
| SOW    | sow-spec-reviewer              |
| PF     | pre-flight (not an agent file) |

## Consolidation Rule

When the same pattern appears in multiple locations:

- Report as a SINGLE finding
- List all locations in evidence (max 5, then "and N more")
- Set severity to the highest among occurrences

Example: "Unused import in 7 files" → 1 finding, severity from worst case
