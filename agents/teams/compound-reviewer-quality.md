---
name: compound-reviewer-quality
description: Design patterns, testability, test coverage, performance, accessibility, and documentation.
tools: [Read, Grep, Glob, LS, Task(design-pattern-reviewer), Task(testability-reviewer), Task(test-coverage-reviewer), Task(performance-reviewer), Task(accessibility-reviewer), Task(document-reviewer), SendMessage]
model: sonnet
context: fork
skills: [applying-frontend-patterns, reviewing-testability, optimizing-performance]
---

# Compound Reviewer: Quality

Run domain agents, DM combined findings to `challenger` AND `verifier`.

## Domains

| Order | Agent          | subagent_type           | Depends On                                   |
| ----- | -------------- | ----------------------- | -------------------------------------------- |
| 1     | Design Pattern | design-pattern-reviewer | —                                            |
| 2     | Testability    | testability-reviewer    | —                                            |
| 3     | Test Coverage  | test-coverage-reviewer  | Only if test files changed                   |
| 4     | Performance    | performance-reviewer    | —                                            |
| 5     | Accessibility  | accessibility-reviewer  | Only if \*.tsx/\*.jsx/\*.html/\*.css present |
| 6     | Documentation  | document-reviewer       | Only if \*.md files present                  |

## Execution

| Step | Action                                                                | Mode     |
| ---- | --------------------------------------------------------------------- | -------- |
| 1    | Check for test files and \*.md files in target scope                  | —        |
| 2    | Launch domains 1-2,4 via Task (+ conditional domains 3,5,6 as needed) | parallel |
| 3    | Collect all findings                                                  | —        |
| 4    | Normalize to standard schema (see below)                              | —        |

## Schema Normalization

| Agent                  | Extra Fields                  | Mapping                                                       |
| ---------------------- | ----------------------------- | ------------------------------------------------------------- |
| performance-reviewer   | `impact`                      | Append to `evidence`; impact → `reasoning` note               |
| accessibility-reviewer | `wcag`                        | Append to `evidence`                                          |
| test-coverage-reviewer | `related_code`, `criticality` | `related_code` → `evidence`; `criticality` → `reasoning` note |
| document-reviewer      | (none)                        | —                                                             |

## Council Communication

After normalizing, share cross-domain findings with peer compound reviewers before reporting.

| Step | Action                                                                  |
| ---- | ----------------------------------------------------------------------- |
| 1    | Identify P1 (critical/high at location) and P2 (pattern in 3+ files)    |
| 2    | DM P1/P2 summary to both Council peers (names from spawn prompt)        |
| 3    | Proceed without waiting (peer responses arrive asynchronously)          |
| 4    | Add `cross_domain_context` to findings that overlap with peer locations |
| 5    | SendMessage to `challenger` AND `verifier` with enriched findings       |

Conflict resolution: Safety > Foundation > Quality.

## Output

```yaml
domain: quality
findings:
  - finding_id: "<from sub-reviewer>"
    agent: <agent-name>
    severity: critical|high|medium|low
    category: "<category>"
    location: "<file>:<line>"
    evidence: "<code snippet>"
    reasoning: "<why this is an issue>"
    fix: "<suggested fix>"
    confidence: 0.60-1.00
    verification_hint:
      check: "<check type>"
      question: "<what to verify>"
    cross_domain_context:
      - peer: "<reviewer-name>"
        related_finding: "<summary>"
summary:
  total: <count>
  skipped_domains: ["accessibility", "documentation"]
  by_domain:
    design_pattern: <count>
    testability: <count>
    test_coverage: <count>
    performance: <count>
    accessibility: <count>
    documentation: <count>
```

| Error               | Recovery                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Agent timeout       | Continue with completed agents, DM partial results                                       |
| No findings         | Include empty array for that domain                                                      |
| SendMessage failure | Retry once, then include structured YAML (same Output schema) in task completion message |
