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

Run domain agents, DM combined findings to `challenger` AND `verifier`.

## Domains

| Order | Agent                   | subagent_type         | Depends On           |
| ----- | ----------------------- | --------------------- | -------------------- |
| 1     | Code Quality            | code-quality-reviewer | —                    |
| 2     | Progressive Enhancement | progressive-enhancer  | —                    |
| 3     | Root Cause              | root-cause-reviewer   | Code Quality results |

## Execution

| Step | Action                                                             | Mode              |
| ---- | ------------------------------------------------------------------ | ----------------- |
| 1    | Launch `code-quality-reviewer` via Task                            | parallel          |
| 2    | Launch `progressive-enhancer` via Task                             | parallel (with 1) |
| 3    | Wait for code-quality results                                      | —                 |
| 4    | Launch `root-cause-reviewer` via Task (pass code-quality findings) | sequential        |
| 5    | Collect all findings, normalize to standard schema (see below)     | —                 |

## Schema Normalization

| Agent                 | Extra Fields              | Mapping                                                        |
| --------------------- | ------------------------- | -------------------------------------------------------------- |
| root-cause-reviewer   | `root_cause`, `five_whys` | `root_cause` → `reasoning`; `five_whys` → append to `evidence` |
| progressive-enhancer  | `recommendations`         | Append to findings as separate items (not per-finding)         |
| code-quality-reviewer | `subcategory`             | Append to `category` as `category/subcategory`                 |

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
domain: foundation
findings:
  - finding_id: "<domain>-<seq>"
    agent: <agent-name>
    severity: critical|high|medium|low
    category: "<category>"
    location: "<file>:<line>"
    evidence: "<code snippet>"
    reasoning: "<why this is an issue>"
    fix: "<suggested fix>"
    confidence: 0.70-1.00
    verification_hint:
      check: "<check type>"
      question: "<what to verify>"
    cross_domain_context:
      - peer: "<reviewer-name>"
        related_finding: "<summary>"
summary:
  total: <count>
  by_domain:
    code_quality: <count>
    progressive_enhancement: <count>
    root_cause: <count>
```

| Error               | Recovery                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Agent timeout       | Continue with completed agents, DM partial results                                       |
| No findings         | Include empty array for that domain                                                      |
| SendMessage failure | Retry once, then include structured YAML (same Output schema) in task completion message |
