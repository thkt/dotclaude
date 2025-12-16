<!--
Golden Master: SOW - Workflow Improvement

Selection criteria:
- sow-spec-reviewer score: 95/100
- Phased incremental improvement approach
- Consistent use of ✓/→/? markers
- Quantitative current state analysis (command line count, context size)
- Concrete Acceptance Criteria (day-based planning)

Features:
- 4-phase implementation plan
- Compatibility consideration with existing workflow
- Risk classification by confidence level

Source: ~/.claude/workspace/planning/2025-12-16-spec-driven-workflow-improvement/
-->

# SOW: Workflow Improvement Based on Spec-Driven Development Practices

Version: 1.0.0
Status: Draft
Created: 2025-12-16

---

## Executive Summary

[→] Apply spec-driven development practices to current Claude Code workflow, addressing Context Confusion and improving prompt quality. Implement improvements incrementally while maintaining compatibility with existing workflow.

**Key improvement areas**:

1. Context minimization (improve S/N ratio)
2. Golden master approach introduction (quality quantification)
3. Single responsibility for commands (maintainability improvement)
4. Instruction simplification (technical debt reduction)

---

## Problem Analysis

### Current State [✓]

| Metric | Current Value | Issue |
|--------|---------------|-------|
| Total commands | 28 files | Management overhead |
| Max command lines | 809 lines (/think) | Too complex |
| /code reference context | 2,827 lines | S/N ratio degradation |
| Single responsibility violations | 3 commands | Maintainability degradation |

Evidence: `wc -l ~/.claude/commands/*.md`, research results

### Verified Issues [✓]

- [✓] /code references 2,827 lines of context - Evidence: wc -l measurement
- [✓] /think generates 2 artifacts (sow.md + spec.md) simultaneously - Evidence: think.md:330-340
- [✓] 4 commands exceed 500 lines - Evidence: wc -l results

### Inferred Problems [→]

- [→] Excessive context affects LLM output quality
- [→] Complex prompts cause unpredictable behavior
- [→] Maintenance cost increases as technical debt

### Suspected Issues [?]

- [?] Threshold where context size affects LLM processing performance
- [?] Learning cost for team adoption
- [?] ROI of tool-agnostic approach

---

## Assumptions & Prerequisites

### Verified Facts (✓)

- [✓] Current command structure (28 files) - Evidence: find results
- [✓] /code is already modularized (ADR 0001) - Evidence: commands/code/
- [✓] Artifact flow is file-based - Evidence: workspace/planning/

### Working Assumptions (→)

- [→] 7 practices from the article are applicable to current environment
- [→] Incremental improvement won't break existing workflow
- [→] Golden master approach can quantify quality

### Unknown/Needs Verification (?)

- [?] Method to measure actual effect of context reduction
- [?] Optimal command line count guideline (50? 100?)
- [?] Best practices for template externalization

---

## Solution Design

### Proposed Approach [→]

**Phase 1: Quick wins (1-2 days)**

- Golden master introduction
- Context minimization design

**Phase 2: Structural improvement (3-5 days)**

- /think split (/sow + /spec)
- Large command simplification

**Phase 3: Long-term improvement (under consideration)**

- Gradual migration to tool-agnostic approach

### Alternatives Considered

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| [→] A: Incremental improvement | Low risk, compatibility maintained | Takes time | **Adopted** |
| [→] B: Full refactoring | Consistency ensured | High risk, downtime | Rejected |
| [→] C: Status quo | Zero effort | Problems continue | Rejected |

### Recommendation

**Option A: Incremental improvement** - Confidence: [→]

Rationale:

- Minimize impact on existing workflow
- Verify effectiveness at each phase
- Easy rollback

---

## Test Plan

### Unit Tests (Priority: High)

- [ ] Output comparison test with golden master
- [ ] Command behavior test after context reduction
- [ ] Individual behavior test after /sow and /spec split

### Integration Tests (Priority: Medium)

- [ ] /research → /sow → /spec → /code flow
- [ ] Auto-loading of context files
- [ ] Integration with sow-spec-reviewer

### E2E Tests (Priority: Low)

- [ ] Complete workflow with /full-cycle
- [ ] Initial setup for new projects

---

## Acceptance Criteria

### Phase 1: Golden Master Introduction

- [ ] [✓] Create golden-masters/ directory
- [ ] [✓] Accumulate at least 3 ideal SOW/Spec examples
- [ ] [→] Establish prompt quality comparison criteria

### Phase 2: Context Minimization

- [ ] [→] Reduce /code reference context to below 1,500 lines
- [ ] [→] Create documentation separating essential and reference principles
- [ ] [?] Measure S/N ratio improvement effect

### Phase 3: Command Split

- [ ] [→] Split /think into /sow + /spec
- [ ] [→] Each command generates single artifact
- [ ] [✓] Maintain compatibility with existing workflow

### Phase 4: Instruction Simplification

- [ ] [→] Reduce commands over 500 lines to below 200 lines
- [ ] [→] Externalize templates to separate files
- [ ] [?] Verify improved readability and maintainability

---

## Implementation Plan

### Phase 1: Golden Master Introduction (Day 1)

```markdown
1. Create golden-masters/ directory
2. Select excellent existing SOW/Spec
3. Create quality criteria documentation
```

### Phase 2: Context Minimization Design (Day 2)

```markdown
1. Identify essential principles (TDD, Occam's Razor)
2. Separate reference principles (SOLID, DRY, etc.)
3. Design task-type-specific context selection
```

### Phase 3: /think Split (Day 3-4)

```markdown
1. Create /sow command (sow.md generation only)
2. Create /spec command (spec.md generation only)
3. Make /think a thin orchestrator
4. Update existing references
```

### Phase 4: Instruction Simplification (Day 5+)

```markdown
1. Extract core instructions
2. Create templates/ directory
3. Refactor large commands
```

---

## Success Metrics

- [✓] 3+ ideal examples in golden-masters/ - Measurable: file count
- [→] 50% reduction in /code reference context - Measurable: wc -l
- [→] 0 commands over 500 lines - Measurable: wc -l
- [?] Prompt quality improvement - Measurable: review score comparison

---

## Risks & Mitigations

### High Confidence Risks (✓)

| Risk | Impact | Mitigation |
|------|--------|------------|
| [✓] Existing workflow breakage | High | Incremental migration, compatibility layer |
| [✓] Functionality degradation from context reduction | Medium | Careful selection of essential principles |

### Potential Risks (→)

| Risk | Impact | Mitigation |
|------|--------|------------|
| [→] Difficult to measure improvement effect | Medium | Golden master comparison |
| [→] Increased learning cost | Low | Documentation improvement |

### Unknown Risks (?)

| Risk | Monitoring | Preparation |
|------|------------|-------------|
| [?] LLM version dependency | Test with new versions | Rollback procedure |

---

## Verification Checklist

Before starting implementation, verify:

- [x] Review research results
- [ ] Backup existing workflow
- [ ] Agree on success criteria for each phase
- [ ] Confirm rollback procedure

---

## References

- Research results: ~/.claude/workspace/research/2025-12-16-spec-driven-workflow-improvement.md
- Related ADR: ADR 0001 (/code modularization)
