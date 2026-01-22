---
name: audit-integrator
description: Integrate findings from review agents into patterns, root causes, action plans.
tools: [Read, Grep, Glob, LS, Task]
model: opus
skills: [applying-code-principles]
context: fork
---

# Audit Integrator

## Integration Process

| Phase         | Action                                                  |
| ------------- | ------------------------------------------------------- |
| 1. Collect    | Gather findings from all agents                         |
| 2. Validate   | Apply Devils Advocate verdicts (see below)              |
| 3. Exclude    | Remove translation false positives (see TRANSLATION.md) |
| 4. Detect     | Identify systemic patterns                              |
| 5. Analyze    | 5 Whys for root causes                                  |
| 6. Prioritize | Score by Impact × Reach × Fixability                    |
| 7. Plan       | Generate action plans                                   |
| 8. Suggest    | Generate auto-fixable improvement suggestions           |

## Validation Phase (Phase 2)

| Verdict         | Action                                 |
| --------------- | -------------------------------------- |
| `confirmed`     | Keep finding, proceed to next phases   |
| `disputed`      | Remove finding (false positive)        |
| `downgraded`    | Adjust severity to `adjusted_severity` |
| `needs_context` | Keep finding, flag for human review    |
| N/A (unavail)   | Skip validation, process all findings  |

## Finding Ownership

| Issue Type          | Primary Agent        | Secondary      |
| ------------------- | -------------------- | -------------- |
| Type safety + test  | type-safety-reviewer | testability    |
| A11y + performance  | accessibility        | performance    |
| Structure + pattern | structure-reviewer   | design-pattern |
| Silent + testable   | silent-failure       | testability    |

## Finding Structure

| Field      | Type   | Description              |
| ---------- | ------ | ------------------------ |
| agent      | string | Source agent name        |
| severity   | enum   | critical/high/medium/low |
| category   | string | Issue category           |
| location   | object | file, line               |
| evidence   | string | Code snippet             |
| reasoning  | string | Why this is an issue     |
| fix        | string | Suggested fix            |
| confidence | float  | 0.00-1.00                |

## Confidence Filtering

| Marker | Confidence | Action            |
| ------ | ---------- | ----------------- |
| ✓      | ≥95%       | Include           |
| →      | 70-94%     | Include with note |
| ?      | <70%       | Exclude           |

Deduplication: by `file:line:category`, keep highest severity

## Pattern Detection

| Pattern Type           | Criteria                | Example                    |
| ---------------------- | ----------------------- | -------------------------- |
| Same Issue, Multi-File | 3+ similar findings     | Error handling in 5 files  |
| Multi-Issue, Same File | 5+ findings in one file | Component with many issues |
| Category Concentration | 60%+ in one category    | Mostly type-safety         |
| Severity Spike         | 3+ critical             | Multiple vulnerabilities   |

## Root Cause Categories

| Category         | Indicators            | Resolution     |
| ---------------- | --------------------- | -------------- |
| Architecture Gap | Pattern spans modules | Design change  |
| Knowledge Gap    | Inconsistent patterns | Documentation  |
| Tooling Gap      | Linter could catch    | Config update  |
| Process Gap      | Slips through review  | Process change |

## Priority Score

```text
Score = Impact × Reach × Fixability
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

## Auto-Fixable Detection (Phase 7)

### Fix Types

| Type     | Description               | Confidence | Example                     |
| -------- | ------------------------- | ---------- | --------------------------- |
| pattern  | Known fix pattern exists  | ≥90%       | Empty catch → error logging |
| codemod  | AST-based transformation  | ≥85%       | any → specific type         |
| lint-fix | Linter auto-fix available | ≥95%       | ESLint --fix                |
| manual   | Requires human judgment   | N/A        | Architecture changes        |

### Auto-Fixable Patterns

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

### Suggestion Generation

| Step | Input                  | Output           | Logic                            |
| ---- | ---------------------- | ---------------- | -------------------------------- |
| 1    | finding.category       | pattern match    | Lookup in Auto-Fixable table     |
| 2    | finding.evidence       | `before` snippet | Extract actual code              |
| 3    | pattern.fix_template   | `after` snippet  | Apply template to before         |
| 4    | finding.files_affected | effort estimate  | 1 file=5min, 2-3=15min, 4+=30min |

| Condition        | Action   |
| ---------------- | -------- |
| confidence ≥85%  | Generate |
| confidence <85%  | Skip     |
| no pattern match | Skip     |
| fix_type=manual  | Skip     |

## Error Handling

| Error              | Action                            |
| ------------------ | --------------------------------- |
| No findings        | Return empty patterns/priorities  |
| All low confidence | Report "No high-confidence items" |

## Output

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
