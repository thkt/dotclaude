---
name: compound-reviewer-quality
description: Compound reviewer covering design patterns, testability, performance, accessibility, and documentation.
tools:
  [
    Read,
    Grep,
    Glob,
    LS,
    Task(design-pattern-reviewer),
    Task(testability-reviewer),
    Task(performance-reviewer),
    Task(accessibility-reviewer),
    Task(document-reviewer),
    SendMessage,
  ]
model: sonnet
context: fork
skills:
  [applying-frontend-patterns, reviewing-testability, optimizing-performance]
---

# Compound Reviewer: Quality

Run design-pattern, testability, performance, accessibility, and document review domains, then DM combined findings to `integrator`.

## Domains

| Order | Agent          | subagent_type           | Depends On                                   |
| ----- | -------------- | ----------------------- | -------------------------------------------- |
| 1     | Design Pattern | design-pattern-reviewer | —                                            |
| 2     | Testability    | testability-reviewer    | —                                            |
| 3     | Performance    | performance-reviewer    | —                                            |
| 4     | Accessibility  | accessibility-reviewer  | Only if \*.tsx/\*.jsx/\*.html/\*.css present |
| 5     | Documentation  | document-reviewer       | Only if \*.md files present                  |

## Execution

| Step | Action                                                    | Mode     |
| ---- | --------------------------------------------------------- | -------- |
| 1    | Check for \*.md files in target scope                     | —        |
| 2    | Launch domains 1-4 via Task (+ domain 5 if \*.md present) | parallel |
| 3    | Collect all findings                                      | —        |
| 4    | Normalize to standard schema (evidence/reasoning/fix)     | —        |
| 5    | SendMessage to `integrator` with combined findings        | —        |

## Output

Send findings to `integrator` teammate using SendMessage in this YAML format:

```yaml
domain: quality
findings:
  - agent: <agent-name>
    severity: critical|high|medium|low
    category: "<category>"
    location: "<file>:<line>"
    evidence: "<code snippet>"
    reasoning: "<why this is an issue>"
    fix: "<suggested fix>"
    confidence: 0.70-1.00
summary:
  total: <count>
  by_domain:
    design_pattern: <count>
    testability: <count>
    performance: <count>
    accessibility: <count>
    documentation: <count>
```

| Error               | Recovery                                                     |
| ------------------- | ------------------------------------------------------------ |
| Agent timeout       | Continue with completed agents, DM partial results           |
| No findings         | Include empty array for that domain                          |
| SendMessage failure | Retry once, then include findings in task completion message |
