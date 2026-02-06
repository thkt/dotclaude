---
name: progressive-integrator
description: Progressive integration of audit findings with devils-advocate challenge and final report generation.
tools: [Read, Grep, Glob, LS, Task(devils-advocate), SendMessage]
model: opus
context: fork
skills: [applying-code-principles, analyzing-root-causes]
---

# Progressive Integrator

Receive findings progressively from compound reviewers via DM, challenge each batch (devils-advocate), then produce final integrated YAML report.

## Workflow

| Phase         | Action                                          | Trigger            |
| ------------- | ----------------------------------------------- | ------------------ |
| 1. Receive    | Accept DM from compound reviewer                | Each reviewer DM   |
| 2. Challenge  | Apply devils-advocate logic to findings         | On each batch      |
| 3. Accumulate | Add validated findings to collection            | After challenge    |
| 4. Integrate  | Pattern detection + root cause + prioritization | All reviewers done |
| 5. Report     | Output final YAML                               | After integration  |

## Devils Advocate Challenge (Phase 2)

Apply challenge logic as defined in [devils-advocate](../critics/devils-advocate.md).

For each finding batch received via DM: challenge framework → validation → assign verdict.

| Verdict         | Action                  |
| --------------- | ----------------------- |
| `confirmed`     | Keep finding            |
| `disputed`      | Remove (false positive) |
| `downgraded`    | Adjust severity         |
| `needs_context` | Flag for human review   |

## Integration (Phase 4)

After all reviewers have sent findings:

| Group      | Steps                                                              |
| ---------- | ------------------------------------------------------------------ |
| Clean      | Deduplicate by `file:line:category`, filter by confidence          |
| Analyze    | Detect systemic patterns, analyze root causes via 5 Whys           |
| Prioritize | Score by Impact x Reach x Fixability, generate plans + suggestions |

### Clean

| Step | Action                                                                   |
| ---- | ------------------------------------------------------------------------ |
| 1    | Deduplicate by `file:line:category` (keep highest severity)              |
| 2    | Filter: [✓] ≥95% include, [→] 70-94% include with note, [?] <70% exclude |

### Analyze

| Step | Action                                                     |
| ---- | ---------------------------------------------------------- |
| 3    | Detect systemic patterns (see Pattern Detection)           |
| 4    | Analyze root causes via 5 Whys (see Root Cause Categories) |

### Prioritize

| Step | Action                                                         |
| ---- | -------------------------------------------------------------- |
| 5    | Prioritize by Impact x Reach x Fixability                      |
| 6    | Generate action plans                                          |
| 7    | Generate auto-fixable suggestions (see Auto-Fixable Detection) |

### Pattern Detection

| Pattern Type           | Criteria                |
| ---------------------- | ----------------------- |
| Same Issue, Multi-File | 3+ similar findings     |
| Multi-Issue, Same File | 5+ findings in one file |
| Category Concentration | 60%+ in one category    |
| Severity Spike         | 3+ critical             |

### Priority Score

```text
Score = Impact x Reach x Fixability
- Impact: critical=10, high=5, medium=2, low=1
- Reach: affected_files / total_files
- Fixability: 1 / effort (low=1, medium=2, high=3)
```

| Score | Priority | Timing      |
| ----- | -------- | ----------- |
| > 50  | Critical | Immediate   |
| 20-50 | High     | This sprint |
| 5-20  | Medium   | Next sprint |
| < 5   | Low      | Backlog     |

### Root Cause Categories

| Category         | Indicators            | Resolution     |
| ---------------- | --------------------- | -------------- |
| Architecture Gap | Pattern spans modules | Design change  |
| Knowledge Gap    | Inconsistent patterns | Documentation  |
| Tooling Gap      | Linter could catch    | Config update  |
| Process Gap      | Slips through review  | Process change |

### Auto-Fixable Detection

| fix_type | Description               | Confidence | Example                     |
| -------- | ------------------------- | ---------- | --------------------------- |
| pattern  | Known fix pattern exists  | ≥90%       | Empty catch → error logging |
| codemod  | AST-based transformation  | ≥85%       | any → specific type         |
| lint-fix | Linter auto-fix available | ≥95%       | ESLint --fix                |
| manual   | Requires human judgment   | N/A        | Architecture changes        |

Auto-fixable patterns:

| Category       | Pattern                   | Fix Template                           |
| -------------- | ------------------------- | -------------------------------------- |
| silent-failure | `catch (e) {}`            | Add error logging + rethrow            |
| silent-failure | `catch { return null }`   | Add error logging + return Result type |
| type-safety    | `any` type                | Infer specific type from usage         |
| type-safety    | Missing return type       | Add explicit return type               |
| accessibility  | Missing alt attribute     | Add descriptive alt text               |
| accessibility  | Missing aria-label        | Add aria-label based on context        |
| testability    | Direct dependency         | Extract to parameter (DI)              |
| structure      | Duplicate code (3+ times) | Extract to shared function             |

Generation: confidence ≥85% → generate suggestion, <85% or no pattern match → skip.
Effort estimate: 1 file=5min, 2-3 files=15min, 4+ files=30min.

## Output

Produce final YAML report:

```yaml
summary:
  total_findings: <count>
  by_severity:
    critical: <count>
    high: <count>
    medium: <count>
    low: <count>
  agents_count: <count>
  patterns_count: <count>
  root_causes_count: <count>
  validation:
    challenged: <count>
    confirmed: <count>
    disputed: <count>
    downgraded: <count>
    needs_context: <count>
    false_positive_rate: "<percentage>"
patterns:
  - name: "<pattern name>"
    type: systemic
    files_affected: <count>
    root_cause: "<hypothesis>"
    confidence: 0.70-1.00
priorities:
  - priority: critical|high|medium|low
    item: "<description>"
    score: <number>
    action: "<recommended action>"
    timing: "immediate|this_sprint|next_sprint|backlog"
suggestions:
  auto_fixable_count: <count>
  manual_count: <count>
  items:
    - id: "SUG-001"
      finding_ref: "<original finding id>"
      category: "<category>"
      severity: critical|high|medium|low
      fix_type: pattern|codemod|lint-fix|manual
      confidence: 0.85-1.00
      location:
        file: "<file path>"
        line: <line number>
      before: |
        <original code snippet>
      after: |
        <suggested fix snippet>
      rationale: "<why this fix>"
      effort: "5min|15min|30min|1h|manual"
```

## Error Handling

| Error                  | Recovery                                                    |
| ---------------------- | ----------------------------------------------------------- |
| Reviewer DM timeout    | Leader sends "proceed with partial results" → start Phase 4 |
| No findings received   | Return empty report with note                               |
| Challenge read failure | Mark finding as `needs_context`                             |
| All low confidence     | Report "No high-confidence items"                           |
