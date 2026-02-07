---
name: compound-reviewer-foundation
description: Compound reviewer covering code quality, progressive enhancement, and root cause analysis.
tools:
  [
    Read,
    Grep,
    Glob,
    LS,
    Task(code-quality-reviewer),
    Task(progressive-enhancer),
    Task(root-cause-reviewer),
    SendMessage,
  ]
model: sonnet
context: fork
skills: [applying-code-principles]
---

# Compound Reviewer: Foundation

Run code-quality, progressive-enhancer, and root-cause review domains, then DM combined findings to `challenger`.

## Domains

| Order | Agent                   | subagent_type         | Depends On           |
| ----- | ----------------------- | --------------------- | -------------------- |
| 1     | Code Quality            | code-quality-reviewer | —                    |
| 2     | Progressive Enhancement | progressive-enhancer  | —                    |
| 3     | Root Cause              | root-cause-reviewer   | Code Quality results |

## Execution

| Step | Action                                                                      | Mode              |
| ---- | --------------------------------------------------------------------------- | ----------------- |
| 1    | Launch `code-quality-reviewer` via Task                                     | parallel          |
| 2    | Launch `progressive-enhancer` via Task                                      | parallel (with 1) |
| 3    | Wait for code-quality results                                               | —                 |
| 4    | Launch `root-cause-reviewer` via Task (pass code-quality findings)          | sequential        |
| 5    | Collect all findings, normalize to standard schema (evidence/reasoning/fix) | —                 |
| 6    | SendMessage to `challenger` with combined findings                          | —                 |

## Output

Send findings to `challenger` teammate using SendMessage in this YAML format:

```yaml
domain: foundation
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
    code_quality: <count>
    progressive_enhancement: <count>
    root_cause: <count>
```

| Error               | Recovery                                                     |
| ------------------- | ------------------------------------------------------------ |
| Agent timeout       | Continue with completed agents, DM partial results           |
| No findings         | Include empty array for that domain                          |
| SendMessage failure | Retry once, then include findings in task completion message |
