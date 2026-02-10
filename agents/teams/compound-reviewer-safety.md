---
name: compound-reviewer-safety
description: Compound reviewer covering security, silent failure, type safety, and type design.
tools:
  [
    Read,
    Grep,
    Glob,
    LS,
    Task(security-reviewer),
    Task(silent-failure-reviewer),
    Task(type-safety-reviewer),
    Task(type-design-reviewer),
    SendMessage,
  ]
model: sonnet
context: fork
skills: [reviewing-security, reviewing-type-safety]
---

# Compound Reviewer: Safety

Run domain agents, DM combined findings to `challenger` AND `verifier`.

## Domains

| Order | Agent          | subagent_type           | Depends On                       |
| ----- | -------------- | ----------------------- | -------------------------------- |
| 1     | Security       | security-reviewer       | —                                |
| 2     | Silent Failure | silent-failure-reviewer | —                                |
| 3     | Type Safety    | type-safety-reviewer    | —                                |
| 4     | Type Design    | type-design-reviewer    | Only if new types added/modified |

## Execution

| Step | Action                                                            | Mode     |
| ---- | ----------------------------------------------------------------- | -------- |
| 1    | Check if new types/interfaces introduced in target scope          | —        |
| 2    | Launch domains 1-3 via Task (+ domain 4 if new types present)     | parallel |
| 3    | Collect all findings                                              | —        |
| 4    | Normalize domain-specific fields to standard schema (see below)   | —        |
| 5    | SendMessage to `challenger` AND `verifier` with combined findings | —        |

## Schema Normalization

| Agent                | Extra Fields          | Mapping                                         |
| -------------------- | --------------------- | ----------------------------------------------- |
| security-reviewer      | (none)                | —                                                |
| silent-failure-reviewer | (none)               | —                                                |
| type-safety-reviewer   | (none)                | —                                                |
| type-design-reviewer   | `type_name`, `scores` | Append to `evidence`; scores → `reasoning` note  |

## Output

```yaml
domain: safety
findings:
  - finding_id: "<domain>-<seq>"  # preserve from reviewer or generate as S-{domain}-{seq}
    agent: <agent-name>
    severity: critical|high|medium|low
    category: "<category>"
    location: "<file>:<line>"
    evidence: "<code snippet>"
    reasoning: "<why this is an issue>"
    fix: "<suggested fix>"
    confidence: 0.70-1.00
    verification_hint:  # pass through from reviewer if present
      check: "<check type>"
      question: "<what to verify>"
summary:
  total: <count>
  by_domain:
    security: <count>
    silent_failure: <count>
    type_safety: <count>
    type_design: <count>
```

| Error               | Recovery                                                     |
| ------------------- | ------------------------------------------------------------ |
| Agent timeout       | Continue with completed agents, DM partial results           |
| No findings         | Include empty array for that domain                          |
| SendMessage failure | Retry once, then include findings in task completion message |
